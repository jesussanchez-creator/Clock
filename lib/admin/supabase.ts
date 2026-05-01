import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con privilegios de service_role.
 *
 * Salta RLS, así que SOLO debe construirse en endpoints server-side
 * que ya hayan validado que el usuario es admin (isAdminEmail).
 *
 * Nunca importar este módulo desde un componente cliente.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[admin/supabase] Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
