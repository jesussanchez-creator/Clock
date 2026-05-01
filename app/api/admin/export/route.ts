import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/auth";
import { isAllowedEmailDomain } from "@/lib/validations/email";
import {
  fetchEvents,
  fetchDailySummary,
  type ExportFilters,
} from "@/lib/admin/queries";
import {
  buildEventsWorkbook,
  buildSummaryWorkbook,
  buildFilename,
} from "@/lib/admin/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  /** "events" → eventos detallados ;  "summary" → resumen diario. */
  kind?: "events" | "summary";
  dateFrom?: string;  // "yyyy-MM-dd"
  dateTo?: string;    // "yyyy-MM-dd"
  emails?: string[];  // [] ⇒ todos
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function jsonError(status: number, code: string, extra?: object) {
  return NextResponse.json({ error: code, ...extra }, { status });
}

export async function POST(request: Request) {
  // 1. Parse body
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonError(400, "INVALID_JSON");
  }

  const kind = body.kind;
  if (kind !== "events" && kind !== "summary") {
    return jsonError(400, "INVALID_KIND");
  }
  const dateFrom = body.dateFrom;
  const dateTo   = body.dateTo;
  if (!dateFrom || !dateTo || !DATE_RE.test(dateFrom) || !DATE_RE.test(dateTo)) {
    return jsonError(400, "INVALID_DATE");
  }
  if (dateFrom > dateTo) {
    return jsonError(400, "DATE_RANGE_INVERTED");
  }
  const emails = Array.isArray(body.emails) ? body.emails.filter(Boolean) : [];

  // 2. Auth + dominio + admin
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAllowedEmailDomain(user.email)) {
    return jsonError(401, "UNAUTHENTICATED");
  }
  if (!isAdminEmail(user.email)) {
    return jsonError(403, "FORBIDDEN");
  }

  // 3. Construir Excel según kind
  const filters: ExportFilters = { dateFrom, dateTo, emails };
  let buffer: Buffer;
  let filename: string;

  try {
    if (kind === "events") {
      const events = await fetchEvents(filters);
      buffer = await buildEventsWorkbook(events, filters);
      filename = buildFilename("eventos", dateFrom, dateTo);
    } else {
      const rows = await fetchDailySummary(filters);
      buffer = await buildSummaryWorkbook(rows, filters);
      filename = buildFilename("resumen", dateFrom, dateTo);
    }
  } catch (e) {
    console.error("[api/admin/export]", e);
    return jsonError(500, "EXPORT_FAILED");
  }

  // 4. Stream como xlsx
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
