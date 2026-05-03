import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmailDomain } from "@/lib/validations/email";
import LoginButton from "@/components/LoginButton";
import Logo from "@/components/Logo";

interface PageProps {
  searchParams: { error?: string };
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_domain:
    "Tu cuenta no pertenece al dominio corporativo autorizado. Inicia sesión con tu email de empresa.",
  auth_failed:
    "No hemos podido completar la autenticación. Inténtalo de nuevo.",
  missing_code:
    "Ha ocurrido un problema durante el inicio de sesión.",
};

export default async function LoginPage({ searchParams }: PageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email && isAllowedEmailDomain(user.email)) {
    redirect("/");
  }

  const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "";
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Acerca Clock";
  const errorMsg = searchParams.error ? ERROR_MESSAGES[searchParams.error] : null;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <Logo height={48} />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-navy-500">
            {appName}
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Accede con tu cuenta corporativa para registrar tu jornada.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <LoginButton />

        {allowedDomain && (
          <p className="text-xs text-slate-500 mt-6 text-center">
            Sólo se permite el acceso con cuentas{" "}
            <span className="font-medium text-navy-500">@{allowedDomain}</span>
          </p>
        )}
      </div>
    </main>
  );
}
