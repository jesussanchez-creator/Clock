import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmailDomain } from "@/lib/validations/email";
import { isAdminEmail } from "@/lib/validations/admin";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Sesión
  if (!user || !user.email) {
    redirect("/login");
  }

  // 2. Dominio
  if (!isAllowedEmailDomain(user.email)) {
    redirect("/login?error=invalid_domain");
  }

  // 3. Admin
  if (!isAdminEmail(user.email)) {
    // No es admin → de vuelta al fichador
    redirect("/");
  }

  // El panel admin NO comprueba IP (RRHH puede consultar desde cualquier sitio).

  return <AdminPanel email={user.email} />;
}
