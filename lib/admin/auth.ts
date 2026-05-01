/**
 * Devuelve true si el email está en la whitelist de admins.
 *
 * La whitelist vive en la variable de entorno ADMIN_EMAILS, coma-separada.
 * Comparamos en minúsculas y limpiamos espacios.
 *
 * Esta función SOLO se usa server-side. NUNCA llamar desde cliente:
 * la lista de admins no debe salir del servidor.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = (process.env.ADMIN_EMAILS ?? "").trim();
  if (!raw) return false;
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
