import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SummaryRow {
  email: string;
  full_name: string | null;
  local_date: string;
  first_clock_in: string | null;
  last_clock_out: string | null;
  break_minutes: number | null;
  lunch_minutes: number | null;
  gross_minutes: number | null;
  net_worked_minutes: number | null;
}

/**
 * GET /api/admin/export-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&emails=a@x,b@y
 *
 * Devuelve un .xlsx con el resumen diario por trabajador desde la vista
 * `daily_time_summary`. Si no se pasan emails, incluye todos los trabajadores.
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
    .from("daily_time_summary")
    .select("*")
    .gte("local_date", from)
    .lte("local_date", to)
    .order("local_date", { ascending: true })
    .order("email", { ascending: true });

  if (emails && emails.length > 0) {
    query = query.in("email", emails);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/export-summary] error:", error.message);
    return NextResponse.json({ error: "DB_READ_ERROR" }, { status: 500 });
  }

  const rows = (data ?? []) as SummaryRow[];

  // Construimos el Excel
  const sheetData = [
    [
      "Trabajador",
      "Email",
      "Fecha",
      "Inicio jornada",
      "Fin jornada",
      "Minutos descanso",
      "Horas descanso",
      "Minutos comida",
      "Horas comida",
      "Minutos brutos",
      "Horas brutas",
      "Minutos netos",
      "Horas netas",
    ],
    ...rows.map((r) => [
      r.full_name ?? "",
      r.email,
      r.local_date,
      formatTimestampMadrid(r.first_clock_in),
      formatTimestampMadrid(r.last_clock_out),
      numOrEmpty(r.break_minutes),
      hoursFromMinutes(r.break_minutes),
      numOrEmpty(r.lunch_minutes),
      hoursFromMinutes(r.lunch_minutes),
      numOrEmpty(r.gross_minutes),
      hoursFromMinutes(r.gross_minutes),
      numOrEmpty(r.net_worked_minutes),
      hoursFromMinutes(r.net_worked_minutes),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = [
    { wch: 28 }, { wch: 28 }, { wch: 12 },
    { wch: 18 }, { wch: 18 },
    { wch: 18 }, { wch: 14 },
    { wch: 18 }, { wch: 14 },
    { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Resumen diario");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `resumen-diario_${from}_a_${to}.xlsx`;

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

// ---------------- helpers ----------------

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function numOrEmpty(n: number | null | undefined): number | string {
  if (n === null || n === undefined) return "";
  return Math.round(n * 100) / 100;
}

function hoursFromMinutes(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  const total = Math.round(n);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatTimestampMadrid(ts: string | null | undefined): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return ts;
  }
}
