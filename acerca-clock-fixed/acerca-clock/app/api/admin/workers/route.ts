import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Worker {
  email: string;
  full_name: string | null;
}

/**
 * GET /api/admin/workers
 * Devuelve la lista de trabajadores únicos que tienen al menos un evento.
 * Solo accesible para admins.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const admin = createSupabaseAdminClient();

  // Traemos email + full_name. Postgres no tiene "distinct on" sencillo en supabase-js,
  // así que filtramos en memoria. Para volúmenes < 10k filas/día es trivialmente rápido.
  const { data, error } = await admin
    .from("time_events")
    .select("email, full_name")
    .order("event_timestamp", { ascending: false })
    .limit(50000);

  if (error) {
    console.error("[admin/workers] error:", error.message);
    return NextResponse.json({ error: "DB_READ_ERROR" }, { status: 500 });
  }

  const map = new Map<string, Worker>();
  for (const row of data ?? []) {
    const email = (row.email as string)?.toLowerCase();
    if (!email) continue;
    if (!map.has(email)) {
      map.set(email, {
        email,
        full_name: (row.full_name as string | null) ?? null,
      });
    } else if (row.full_name && !map.get(email)!.full_name) {
      map.get(email)!.full_name = row.full_name as string;
    }
  }

  const workers = Array.from(map.values()).sort((a, b) =>
    (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email, "es")
  );

  return NextResponse.json({ workers });
}
