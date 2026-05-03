import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware que refresca la sesión de Supabase en cada request.
 *
 * Sin este middleware, las cookies de auth pueden expirar entre páginas
 * y producir comportamientos erráticos en producción (sesión que parece
 * activa pero los endpoints devuelven 401).
 *
 * Se aplica a todas las rutas excepto:
 *  - assets estáticos de Next (_next/*)
 *  - el favicon
 *  - imágenes en /public
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Esto refresca la sesión si está cerca de expirar.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Excluimos:
     *  - _next/static (build assets)
     *  - _next/image (optimización imágenes)
     *  - favicon, logo, archivos públicos
     *  - cualquier ruta con extensión (svg, png, ico, txt...)
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.png|favicon.svg|.*\\..*).*)",
  ],
};
