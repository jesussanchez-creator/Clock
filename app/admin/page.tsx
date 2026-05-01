import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmailDomain } from "@/lib/validations/email";
import { isAdminEmail } from "@/lib/admin/auth";
import { listAgents } from "@/lib/admin/queries";
import { getLocalDate } from "@/lib/time";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

/**
 * /admin — Panel de RRHH.
 *
 * Gating server-side:
 *   1. Sesión válida.
 *   2. Email del dominio corporativo.
 *   3. Email en ADMIN_EMAILS.
 *
 * Notar: el panel admin NO comprueba IP. RRHH puede consultar
 * y descargar desde cualquier red (decisión confirmada).
 */
export default async function AdminPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }
  if (!isAllowedEmailDomain(user.email)) {
    redirect("/login?error=invalid_domain");
  }
  if (!isAdminEmail(user.email)) {
    // Usuario logueado y válido, pero no admin: lo mandamos al fichador.
    redirect("/");
  }

  const agents = await listAgents();
  const today = getLocalDate();

  return (
    <AdminPanel
      currentUser={{ email: user.email, fullName:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ?? null }}
      initialAgents={agents}
      today={today}
    />
  );
}
