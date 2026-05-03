import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EventRow {
  id: string;
  email: string;
  full_name: string | null;
  event_type: string;
  event_timestamp: string;
  local_date: string;
  local_time: string;
  timezone: string;
  ip_address: string | null;
  user_agent: string | null;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  CLOCK_IN: "Inicio jornada",
  BREAK_START: "Inicio descanso",
  BREAK_END: "Fin descanso",
  LUNCH_START: "Inicio comida",
  LUNCH_END: "Fin comida",
  CLOCK_OUT: "Fin jornada",
};

/**
 * GET /api/admin/export-events?from=YYYY-MM-DD&to=YYYY-MM-DD&emails=a@x,b@y
 * Devuelve un .xlsx con los eventos individuales de cada trabajador.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const emailsParam = url.searchParams.get("emails");

  if (!from || !to || !isValidDate(from) || !isValidDate(to)) {
    return NextResponse.json(
      { error: "INVALID_DATE_RANGE", reason: "from y to son obligatorios (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const emails = emailsParam
    ? emailsParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    : null;

  const admin = createSupabaseAdminClient();

  let query = admin
    .from("time_events")
    .select(
      "id, email, full_name, event_type, event_timestamp, local_date, local_time, timezone, ip_address, user_agent"
    )
    .gte("local_date", from)
    .lte("local_date", to)
    .order("local_date", { ascending: true })
    .order("event_timestamp", { ascending: true });

  if (emails && emails.length > 0) {
    query = query.in("email", emails);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/export-events] error:", error.message);
    return NextResponse.json({ error: "DB_READ_ERROR" }, { status: 500 });
  }

  const rows = (data ?? []) as EventRow[];

  const sheetData = [
    [
      "Trabajador",
      "Email",
      "Fecha",
      "Hora local",
      "Evento",
      "Tipo (clave)",
      "Timestamp UTC",
      "Zona horaria",
      "IP",
      "User-Agent",
    ],
    ...rows.map((r) => [
      r.full_name ?? "",
      r.email,
      r.local_date,
      r.local_time,
      EVENT_TYPE_LABELS[r.event_type] ?? r.event_type,
      r.event_type,
      r.event_timestamp,
      r.timezone,
      r.ip_address ?? "",
      r.user_agent ?? "",
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = [
    { wch: 28 }, { wch: 28 },
    { wch: 12 }, { wch: 12 },
    { wch: 18 }, { wch: 14 },
    { wch: 26 }, { wch: 16 },
    { wch: 36 }, { wch: 60 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Eventos");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `eventos_${from}_a_${to}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
