import { format } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";

export const APP_TIMEZONE = "Europe/Madrid";

/**
 * Devuelve la fecha local (yyyy-MM-dd) en zona Europa/Madrid para un timestamp UTC dado.
 */
export function getLocalDate(date: Date = new Date()): string {
  return formatInTimeZone(date, APP_TIMEZONE, "yyyy-MM-dd");
}

/**
 * Devuelve la hora local (HH:mm:ss) en zona Europa/Madrid.
 */
export function getLocalTime(date: Date = new Date()): string {
  return formatInTimeZone(date, APP_TIMEZONE, "HH:mm:ss");
}

/**
 * "HH:mm" en horario España.
 */
export function formatHM(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, APP_TIMEZONE, "HH:mm");
}

/**
 * Fecha humana en español: "viernes, 1 de mayo de 2026"
 */
export function formatLongDateEs(date: Date = new Date()): string {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  return format(zoned, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
}

/**
 * Diferencia en minutos entre dos timestamps (UTC strings o Date).
 */
export function diffMinutes(start: Date | string, end: Date | string): number {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 60000));
}

/**
 * Formatea una duración en minutos como "Xh YYm".
 */
export function formatDuration(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}
