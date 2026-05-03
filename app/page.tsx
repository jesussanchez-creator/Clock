import { redirect } from "next/navigation";
import { getSessionState } from "@/lib/validations/session";
import { isAllowedEmailDomain } from "@/lib/validations/email";
import { isAdminEmail } from "@/lib/validations/admin";
import { getClientIp, isIpAllowed } from "@/lib/ip";
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

  // 2. IP (los admins también pasan por aquí — el panel /admin sí está exento)
  const ip = getClientIp();
  if (!isIpAllowed(ip)) {
    redirect("/blocked");
  }

  return (
    <Dashboard
      initialUser={session.user}
      initialEvents={session.events}
      initialState={session.state}
      ip={ip}
      isAdmin={isAdminEmail(session.user.email)}
    />
  );
}
