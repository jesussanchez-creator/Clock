import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con SERVICE ROLE KEY.
 *
 * ⚠️ AVISOS DE SEGURIDAD:
 *  - NUNCA importar este módulo desde un componente cliente
 *    ("use client") ni exponer los datos sin filtrar.
 *  - Salta RLS, así que cualquier endpoint que lo use debe
 *    validar PREVIAMENTE que el usuario es admin.
 *  - La key se lee de SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_*).
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
