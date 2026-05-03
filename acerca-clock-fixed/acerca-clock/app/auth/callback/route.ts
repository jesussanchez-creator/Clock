import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedEmailDomain } from "@/lib/validations/email";

/**
 * Callback OAuth de Supabase. Recibe ?code=... tras volver de Google,
 * lo intercambia por una sesión y redirige al home.
 *
 * IMPORTANTE: en Vercel, request.url puede traer el origin INTERNO
 * (p.ej. https://acerca-clock-xxxx.vercel.app) en vez del dominio
 * público real con el que el usuario está navegando. Si redirigimos
 * a ese origin interno, la cookie de auth queda asociada a otro
 * dominio y se pierde la sesión.
 *
 * Solución: construir el origin a partir de las cabeceras
 * x-forwarded-host / x-forwarded-proto que añade el edge de Vercel.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = resolvePublicOrigin(url);

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange error:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Verificamos dominio corporativo.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAllowedEmailDomain(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=invalid_domain`);
  }

  return NextResponse.redirect(`${origin}/`);
}

/**
 * Resuelve el origin público real:
 *  1. NEXT_PUBLIC_SITE_URL si está configurada (override manual fiable)
 *  2. x-forwarded-host + x-forwarded-proto (las inyecta Vercel)
 *  3. host (header HTTP estándar)
 *  4. fallback: url.origin
 */
function resolvePublicOrigin(fallbackUrl: URL): string {
  const envSite = process.env.NEXT_PUBLIC_SITE_URL;
  if (envSite) return envSite.replace(/\/$/, "");

  const h = headers();
  const forwardedHost = h.get("x-forwarded-host");
  const forwardedProto = h.get("x-forwarded-proto");

  if (forwardedHost) {
    const proto = forwardedProto ?? "https";
    return `${proto}://${forwardedHost}`;
  }

  const host = h.get("host");
  if (host) {
    const proto =
      forwardedProto ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return fallbackUrl.origin;
}
