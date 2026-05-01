"use client";

import { useEffect, useState } from "react";
import type { ClockState, TimeEvent } from "@/lib/validations/clock";

interface Props {
  state: ClockState;
  events: TimeEvent[];
}

/**
 * Devuelve el ISO del último evento. Para el estado actual lo que importa
 * es desde cuándo el usuario está en él, y eso coincide con el timestamp
 * del último fichaje.
 *
 * Excepción: NOT_STARTED no tiene "tiempo" — la jornada aún no empezó.
 *            FINISHED tampoco — la jornada ya cerró, no hay cronómetro vivo.
 */
function getStateStartIso(state: ClockState, events: TimeEvent[]): string | null {
  if (state === "NOT_STARTED" || state === "FINISHED") return null;
  if (events.length === 0) return null;
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.event_timestamp).getTime() -
      new Date(b.event_timestamp).getTime()
  );
  return sorted[sorted.length - 1].event_timestamp;
}

/**
 * Formatea una duración en segundos.
 *  - < 1h    → "MM:SS"
 *  - >= 1h   → "Hh MMm"
 */
function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const mins  = Math.floor((s % 3600) / 60);
  const secs  = s % 60;
  if (hours > 0) {
    return `${hours}h ${mins.toString().padStart(2, "0")}m`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Texto contextual según estado, para acompañar el badge.
 *  - WORKING:  "trabajando desde hace …"
 *  - ON_BREAK: "en descanso desde hace …"
 *  - ON_LUNCH: "en comida desde hace …"
 */
const STATE_PREFIX: Record<ClockState, string> = {
  NOT_STARTED: "",
  WORKING:     "trabajando",
  ON_BREAK:    "en descanso",
  ON_LUNCH:    "en comida",
  FINISHED:    "",
};

export default function StateTimer({ state, events }: Props) {
  const startIso = getStateStartIso(state, events);

  // Reloj vivo: re-renderizamos cada segundo si hay un estado activo.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!startIso) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startIso]);

  if (!startIso) return null;

  const elapsedSec = Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 1000));
  const text = formatElapsed(elapsedSec);
  const prefix = STATE_PREFIX[state];

  return (
    <p className="mt-2 text-xs text-slate-500">
      {prefix && <>{prefix} </>}
      <span
        className="font-mono tabular-nums font-semibold text-slate-700"
        aria-live="polite"
      >
        {text}
      </span>
    </p>
  );
}
