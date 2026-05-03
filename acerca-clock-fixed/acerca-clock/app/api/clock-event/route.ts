import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClientIp, isIpAllowed } from "@/lib/ip";
import { isAllowedEmailDomain } from "@/lib/validations/email";
import { getLocalDate, getLocalTime, APP_TIMEZONE } from "@/lib/time";
import {
  EVENT_TYPES,
  computeCurrentState,
  validateNewEvent,
  type EventType,
  type TimeEvent,
} from "@/lib/validations/clock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  event_type?: string;
}

function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function POST(request: Request) {
  // 1. Parsear payload
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonError(400, "INVALID_JSON");
  }

  const eventType = body.event_type as EventType | undefined;
  if (!eventType || !EVENT_TYPES.includes(eventType)) {
    return jsonError(400, "INVALID_EVENT_TYPE");
  }

  // 2. Autenticación
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return jsonError(401, "UNAUTHENTICATED");
  }

  // 3. Validación de dominio corporativo
  if (!isAllowedEmailDomain(user.email)) {
    return jsonError(403, "INVALID_DOMAIN");
  }

  // 4. Validación de IP
  const ip = getClientIp();
  if (!isIpAllowed(ip)) {
    return jsonError(403, "IP_NOT_ALLOWED", { ip });
  }

  // 5. Cargar eventos del día
  const localDate = getLocalDate();
  const { data: existing, error: selErr } = await supabase
    .from("time_events")
    .select("*")
    .eq("local_date", localDate)
    .order("event_timestamp", { ascending: true });

  if (selErr) {
    console.error("[clock-event] select error:", selErr.message);
    return jsonError(500, "DB_READ_ERROR");
  }

  const events = (existing ?? []) as TimeEvent[];
  const state = computeCurrentState(events);

  // 6. Validación de máquina de estados
  const validation = validateNewEvent(state, events, eventType);
  if (!validation.ok) {
    return jsonError(409, "INVALID_TRANSITION", { reason: validation.reason });
  }

  // 7. Insertar evento inmutable
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  const userAgent = headers().get("user-agent");

  const { data: inserted, error: insErr } = await supabase
    .from("time_events")
    .insert({
      user_id: user.id,
      email: user.email,
      full_name: fullName,
      event_type: eventType,
      // event_timestamp: lo asigna el default (now())
      local_date: localDate,
      local_time: getLocalTime(),
      timezone: APP_TIMEZONE,
      ip_address: ip,
      user_agent: userAgent,
    })
    .select()
    .single();

  if (insErr) {
    console.error("[clock-event] insert error:", insErr.message);
    return jsonError(500, "DB_WRITE_ERROR");
  }

  return NextResponse.json({ ok: true, event: inserted });
}
