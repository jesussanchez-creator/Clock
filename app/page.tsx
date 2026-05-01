import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/validations/session";
import { isAllowedEmailDomain } from "@/lib/validations/email";
import { getClientIp, isIpAllowed } from "@/lib/ip";
import { isAdminEmail } from "@/lib/admin/auth";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 1. Sesión + dominio
  const session = await getSessionState();

  if (!session.user) {
    redirect("/login");
  }
  if (!isAllowedEmailDomain(session.user.email)) {
    redirect("/login?error=invalid_domain");
  }

  // 2. ¿Es admin? Lo comprobamos antes del IP check.
  const isAdmin = isAdminEmail(session.user.email);

  // 3. IP — los admins NO están sujetos a restricción de IP.
  const ip = getClientIp();
  if (!isAdmin && !isIpAllowed(ip)) {
    redirect("/blocked");
  }

  return (
    <Dashboard
      initialUser={session.user}
      initialEvents={session.events}
      initialState={session.state}
      ip={ip}
      isAdmin={isAdmin}
    />
  );
}
