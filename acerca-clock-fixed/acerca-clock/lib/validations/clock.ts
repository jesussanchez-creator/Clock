import { diffMinutes } from "@/lib/time";

// =============================================================================
// Tipos de evento y estados
// =============================================================================

export const EVENT_TYPES = [
  "CLOCK_IN",
  "BREAK_START",
  "BREAK_END",
  "LUNCH_START",
  "LUNCH_END",
  "CLOCK_OUT",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type ClockState =
  | "NOT_STARTED"
  | "WORKING"
  | "ON_BREAK"
  | "ON_LUNCH"
  | "FINISHED";

export interface TimeEvent {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  event_type: EventType;
  event_timestamp: string; // ISO UTC
  local_date: string;      // yyyy-MM-dd Europe/Madrid
  local_time: string;      // HH:mm:ss Europe/Madrid
  timezone: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// =============================================================================
// Mapa de etiquetas en español
// =============================================================================

export const EVENT_LABELS_ES: Record<EventType, string> = {
  CLOCK_IN:    "Inicio de jornada",
  BREAK_START: "Inicio de descanso",
  BREAK_END:   "Vuelta de descanso",
  LUNCH_START: "Inicio de comida",
  LUNCH_END:   "Vuelta de comida",
  CLOCK_OUT:   "Fin de jornada",
};

export const STATE_LABELS_ES: Record<ClockState, string> = {
  NOT_STARTED: "Jornada no iniciada",
  WORKING:     "Trabajando",
  ON_BREAK:    "En descanso",
  ON_LUNCH:    "En comida",
  FINISHED:    "Jornada finalizada",
};

// =============================================================================
// Estado actual
// =============================================================================

/**
 * Calcula el estado actual del trabajador a partir de los eventos del día,
 * ordenados ascendentemente por timestamp.
 */
export function computeCurrentState(events: TimeEvent[]): ClockState {
  if (events.length === 0) return "NOT_STARTED";

  // Tomamos el último evento por timestamp.
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.event_timestamp).getTime() -
      new Date(b.event_timestamp).getTime()
  );
  const last = sorted[sorted.length - 1];

  switch (last.event_type) {
    case "CLOCK_IN":
    case "BREAK_END":
    case "LUNCH_END":
      return "WORKING";
    case "BREAK_START":
      return "ON_BREAK";
    case "LUNCH_START":
      return "ON_LUNCH";
    case "CLOCK_OUT":
      return "FINISHED";
    default:
      return "NOT_STARTED";
  }
}

// =============================================================================
// Eventos permitidos según estado
// =============================================================================

export function getAllowedEvents(state: ClockState): EventType[] {
  switch (state) {
    case "NOT_STARTED":
      return ["CLOCK_IN"];
    case "WORKING":
      return ["BREAK_START", "LUNCH_START", "CLOCK_OUT"];
    case "ON_BREAK":
      return ["BREAK_END"];
    case "ON_LUNCH":
      return ["LUNCH_END"];
    case "FINISHED":
      return [];
  }
}

// =============================================================================
// Validación server-side de un nuevo evento
// =============================================================================

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Aplica todas las reglas del flujo y devuelve si el evento es válido.
 * Reglas:
 *  - No se puede CLOCK_IN dos veces el mismo día.
 *  - No se pueden registrar eventos tras CLOCK_OUT.
 *  - No se puede iniciar descanso/comida si hay otro abierto.
 *  - No se puede finalizar jornada con descanso o comida abiertos.
 *  - No se puede cerrar un descanso si no hay descanso abierto, idem comida.
 */
export function validateNewEvent(
  state: ClockState,
  events: TimeEvent[],
  newEvent: EventType
): ValidationResult {
  // Si la jornada ya está finalizada hoy, nada se permite.
  if (events.some((e) => e.event_type === "CLOCK_OUT")) {
    return { ok: false, reason: "La jornada ya está finalizada hoy." };
  }

  const allowed = getAllowedEvents(state);
  if (!allowed.includes(newEvent)) {
    return {
      ok: false,
      reason: `Acción no permitida en el estado actual (${STATE_LABELS_ES[state]}).`,
    };
  }

  // Reglas adicionales explícitas (cinturón + tirantes):
  if (newEvent === "CLOCK_IN" && events.length > 0) {
    return { ok: false, reason: "Ya iniciaste la jornada hoy." };
  }

  if (newEvent === "BREAK_START" && state === "ON_LUNCH") {
    return { ok: false, reason: "No puedes iniciar descanso con la comida abierta." };
  }

  if (newEvent === "LUNCH_START" && state === "ON_BREAK") {
    return { ok: false, reason: "No puedes iniciar comida con un descanso abierto." };
  }

  if (newEvent === "CLOCK_OUT" && (state === "ON_BREAK" || state === "ON_LUNCH")) {
    return {
      ok: false,
      reason: "Cierra primero el descanso o la comida antes de finalizar.",
    };
  }

  return { ok: true };
}

// =============================================================================
// Resumen del día
// =============================================================================

export interface DaySummary {
  startIso: string | null;
  endIso: string | null;
  grossMinutes: number;
  breakMinutes: number;
  lunchMinutes: number;
  netMinutes: number;
}

/**
 * Calcula el resumen del día emparejando intervalos de descanso/comida.
 * Si un intervalo queda abierto, se ignora en el cómputo (no debería ocurrir
 * para un día finalizado correctamente).
 */
export function computeDaySummary(events: TimeEvent[]): DaySummary {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.event_timestamp).getTime() -
      new Date(b.event_timestamp).getTime()
  );

  const clockIn  = sorted.find((e) => e.event_type === "CLOCK_IN");
  const clockOut = [...sorted].reverse().find((e) => e.event_type === "CLOCK_OUT");

  let breakMinutes = 0;
  let lunchMinutes = 0;
  let openBreak: string | null = null;
  let openLunch: string | null = null;

  for (const e of sorted) {
    switch (e.event_type) {
      case "BREAK_START":
        openBreak = e.event_timestamp;
        break;
      case "BREAK_END":
        if (openBreak) {
          breakMinutes += diffMinutes(openBreak, e.event_timestamp);
          openBreak = null;
        }
        break;
      case "LUNCH_START":
        openLunch = e.event_timestamp;
        break;
      case "LUNCH_END":
        if (openLunch) {
          lunchMinutes += diffMinutes(openLunch, e.event_timestamp);
          openLunch = null;
        }
        break;
    }
  }

  const grossMinutes =
    clockIn && clockOut
      ? diffMinutes(clockIn.event_timestamp, clockOut.event_timestamp)
      : 0;

  const netMinutes = Math.max(0, grossMinutes - breakMinutes - lunchMinutes);

  return {
    startIso: clockIn?.event_timestamp ?? null,
    endIso: clockOut?.event_timestamp ?? null,
    grossMinutes,
    breakMinutes,
    lunchMinutes,
    netMinutes,
  };
}
