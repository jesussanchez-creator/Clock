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
  // IPv4-mapeada en IPv6
  if (/^::ffff:/i.test(ip)) return ip.replace(/^::ffff:/i, "");
  // IPv6 con zone id (fe80::1%eth0) → quitamos zona
  const pct = ip.indexOf("%");
  if (pct !== -1) return ip.substring(0, pct);
  return ip.toLowerCase();
}

/**
 * Lee la whitelist desde env y valida la IP.
 * Soporta:
 *   - IPs exactas IPv4 e IPv6
 *   - Rangos CIDR IPv4 (e.g., 80.25.10.0/24)
 *   - Rangos CIDR IPv6 (e.g., 2a0c:5a80:250e:a501::/64)
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

  const normalizedIp = normalizeIp(ip);
  const ipIsV6 = isIpv6(normalizedIp);

  for (const entry of list) {
    const normalizedEntry = entry.toLowerCase();
    if (normalizedEntry.includes("/")) {
      // CIDR
      if (ipIsV6 && isIpv6Cidr(normalizedEntry)) {
        if (ipv6InCidr(normalizedIp, normalizedEntry)) return true;
      } else if (!ipIsV6 && !isIpv6Cidr(normalizedEntry)) {
        if (ipv4InCidr(normalizedIp, normalizedEntry)) return true;
      }
    } else if (normalizedEntry === normalizedIp) {
      return true;
    }
  }
  return false;
}

// ---------------- IPv4 helpers ----------------

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

// ---------------- IPv6 helpers ----------------

function isIpv6(ip: string): boolean {
  return ip.includes(":");
}

function isIpv6Cidr(cidr: string): boolean {
  return cidr.includes(":") && cidr.includes("/");
}

/**
 * Expande una IPv6 abreviada (con "::") a sus 8 grupos completos
 * y devuelve un array de 8 enteros de 16 bits.
 * Devuelve null si la IP es inválida.
 */
function ipv6ToGroups(ip: string): number[] | null {
  if (!ip || !ip.includes(":")) return null;

  // Manejar el caso especial "::"
  let head: string[] = [];
  let tail: string[] = [];

  if (ip.includes("::")) {
    const parts = ip.split("::");
    if (parts.length !== 2) return null; // sólo puede haber un "::"
    head = parts[0] ? parts[0].split(":") : [];
    tail = parts[1] ? parts[1].split(":") : [];
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    const zeros = Array(missing).fill("0");
    const all = [...head, ...zeros, ...tail];
    return groupsToInts(all);
  } else {
    const groups = ip.split(":");
    if (groups.length !== 8) return null;
    return groupsToInts(groups);
  }
}

function groupsToInts(groups: string[]): number[] | null {
  if (groups.length !== 8) return null;
  const result: number[] = [];
  for (const g of groups) {
    if (g.length === 0 || g.length > 4) return null;
    if (!/^[0-9a-f]+$/i.test(g)) return null;
    const n = parseInt(g, 16);
    if (isNaN(n) || n < 0 || n > 0xffff) return null;
    result.push(n);
  }
  return result;
}

function ipv6InCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  if (!range || isNaN(bits) || bits < 0 || bits > 128) return false;

  const ipGroups = ipv6ToGroups(ip);
  const rangeGroups = ipv6ToGroups(range);
  if (!ipGroups || !rangeGroups) return false;

  if (bits === 0) return true;

  // Comparamos bit a bit el número exacto de bits indicado
  let bitsLeft = bits;
  for (let i = 0; i < 8 && bitsLeft > 0; i++) {
    if (bitsLeft >= 16) {
      if (ipGroups[i] !== rangeGroups[i]) return false;
      bitsLeft -= 16;
    } else {
      const mask = (0xffff << (16 - bitsLeft)) & 0xffff;
      if ((ipGroups[i] & mask) !== (rangeGroups[i] & mask)) return false;
      bitsLeft = 0;
    }
  }
  return true;
}
