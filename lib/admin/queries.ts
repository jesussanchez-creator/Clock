import { createSupabaseAdminClient } from "@/lib/admin/supabase";
import type { TimeEvent } from "@/lib/validations/clock";

/**
 * Devuelve la lista de agentes (trabajadores) que han fichado alguna vez.
 * La fuente de verdad son los emails distintos de la tabla time_events.
 */
export async function listAgents(): Promise<
  { email: string; full_name: string | null }[]
> {
  const supabase = createSupabaseAdminClient();

  // Distinct (email, full_name): no hay distinct directo en supabase-js;
  // pedimos las columnas y deduplicamos en memoria. Tabla pequeña, OK.
  const { data, error } = await supabase
    .from("time_events")
    .select("email, full_name")
    .order("email", { ascending: true });

  if (error) {
    throw new Error(`[admin] listAgents: ${error.message}`);
  }

  // Para cada email, nos quedamos con el full_name más reciente y no nulo.
  const map = new Map<string, string | null>();
  for (const row of data ?? []) {
    const existing = map.get(row.email);
    if (existing === undefined || (row.full_name && !existing)) {
      map.set(row.email, row.full_name ?? null);
    }
  }
  return Array.from(map.entries())
    .map(([email, full_name]) => ({ email, full_name }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export interface ExportFilters {
  /** Fecha local "yyyy-MM-dd" (Europe/Madrid). Inclusiva. */
  dateFrom: string;
  /** Fecha local "yyyy-MM-dd" (Europe/Madrid). Inclusiva. */
  dateTo: string;
  /**
   * Lista de emails a incluir. Vacío o null = todos.
   */
  emails?: string[] | null;
}

/**
 * Eventos en bruto, ordenados (local_date, email, event_timestamp).
 */
export async function fetchEvents(filters: ExportFilters): Promise<TimeEvent[]> {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("time_events")
    .select("*")
    .gte("local_date", filters.dateFrom)
    .lte("local_date", filters.dateTo)
    .order("local_date", { ascending: true })
    .order("email", { ascending: true })
    .order("event_timestamp", { ascending: true });

  if (filters.emails && filters.emails.length > 0) {
    query = query.in("email", filters.emails);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`[admin] fetchEvents: ${error.message}`);
  }
  return (data ?? []) as TimeEvent[];
}

export interface DailySummaryRow {
  email: string;
  full_name: string | null;
  local_date: string;
  first_clock_in: string | null;   // ISO timestamp UTC
  last_clock_out: string | null;
  break_minutes: number;
  lunch_minutes: number;
  gross_minutes: number | null;
  net_worked_minutes: number | null;
}

/**
 * Resumen diario agregado: usa la vista SQL daily_time_summary y aplica
 * los filtros de fecha y email.
 */
export async function fetchDailySummary(
  filters: ExportFilters
): Promise<DailySummaryRow[]> {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("daily_time_summary")
    .select("*")
    .gte("local_date", filters.dateFrom)
    .lte("local_date", filters.dateTo)
    .order("local_date", { ascending: false })
    .order("email", { ascending: true });

  if (filters.emails && filters.emails.length > 0) {
    query = query.in("email", filters.emails);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`[admin] fetchDailySummary: ${error.message}`);
  }
  return (data ?? []) as DailySummaryRow[];
}
