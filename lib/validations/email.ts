/**
 * Verifica que un email pertenece al dominio corporativo permitido.
 */
export function isAllowedEmailDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "")
    .trim()
    .toLowerCase();
  if (!allowed) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === allowed;
}
