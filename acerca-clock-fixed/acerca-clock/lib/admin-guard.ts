import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmailDomain } from "@/lib/validations/email";
import { isAdminEmail } from "@/lib/validations/admin";

/**
 * Valida que la request:
 *  1. Esté autenticada
 *  2. El email pertenezca al dominio corporativo
 *  3. El email esté en la lista ADMIN_EMAILS
 *
 * El panel admin NO tiene restricción de IP (RRHH puede consultar
 * desde casa o en una inspección). El resto de validaciones siguen activas.
 *
 * Devuelve { ok: true, email } o un NextResponse con el error apropiado.
 */
export async function requireAdmin(): Promise<
  | { ok: true; email: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
    };
  }

  if (!isAllowedEmailDomain(user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "INVALID_DOMAIN" }, { status: 403 }),
    };
  }

  if (!isAdminEmail(user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "NOT_ADMIN" }, { status: 403 }),
    };
  }

  return { ok: true, email: user.email };
}
