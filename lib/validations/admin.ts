/**
 * Valida si un email pertenece a la lista de administradores.
 * La lista se configura en la variable de entorno ADMIN_EMAILS
 * separada por comas.
 *
 * Comparación case-insensitive y tolerante a espacios.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/**
 * Devuelve la lista de emails admin (para depuración/UI). No incluye datos sensibles.
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
