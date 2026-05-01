import { headers } from "next/headers";

/**
 * Obtiene la IP pública real del cliente desde las cabeceras del request.
 * Soporta Vercel, proxies estándar y entornos locales.
 *
 * Orden de preferencia:
 *  1. x-forwarded-for (primer valor)
 *  2. x-real-ip
 *  3. x-vercel-forwarded-for (fallback Vercel)
 *  4. cf-connecting-ip (Cloudflare)
 */
export function getClientIp(): string | null {
  const h = headers();

  const xff = h.get("x-forwarded-for");
  if (xff) {
    // x-forwarded-for puede ser "client, proxy1, proxy2"
    const first = xff.split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }

  const realIp = h.get("x-real-ip");
  if (realIp) return normalizeIp(realIp.trim());

  const vercel = h.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }

  const cf = h.get("cf-connecting-ip");
  if (cf) return normalizeIp(cf.trim());

  return null;
}

/**
 * Algunos entornos devuelven IPs como "::ffff:192.168.1.1". Las normalizamos a IPv4.
 */
function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) return ip.substring(7);
  return ip;
}

/**
 * Lee la whitelist desde env y valida la IP.
 * Soporta:
 *   - IPs exactas IPv4/IPv6
 *   - Rangos CIDR IPv4 (e.g., 80.25.10.0/24)
 *
 * BYPASS DE DESARROLLO:
 * Si `DEV_BYPASS_IP_CHECK=true` Y NODE_ENV !== 'production', se saltea la
 * validación. Esto JAMÁS funciona en producción, ni siquiera con la flag
 * activa, porque NODE_ENV en Vercel siempre es 'production'.
 */
export function isIpAllowed(ip: string | null): boolean {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_BYPASS_IP_CHECK === "true"
  ) {
    return true;
  }

  if (!ip) return false;

  const raw = process.env.ALLOWED_OFFICE_IPS ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (list.length === 0) return false;

  for (const entry of list) {
    if (entry.includes("/")) {
      // CIDR
      if (ipv4InCidr(ip, entry)) return true;
    } else if (entry === ip) {
      return true;
    }
  }
  return false;
}

/**
 * Comprobación CIDR sólo para IPv4.
 */
function ipv4InCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  if (!range || isNaN(bits) || bits < 0 || bits > 32) return false;

  const ipNum = ipv4ToInt(ip);
  const rangeNum = ipv4ToInt(range);
  if (ipNum === null || rangeNum === null) return false;

  if (bits === 0) return true;
  const mask = (~0 << (32 - bits)) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const num = parseInt(p, 10);
    if (isNaN(num) || num < 0 || num > 255) return null;
    n = (n << 8) + num;
  }
  return n >>> 0;
}
