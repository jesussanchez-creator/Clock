"use client";

import { useState } from "react";
import {
  type ClockState,
  type EventType,
  getAllowedEvents,
} from "@/lib/validations/clock";
import { cn } from "@/lib/utils";

interface Props {
  state: ClockState;
  onAction: (event: EventType) => Promise<void>;
}

const BUTTON_LABELS: Record<EventType, string> = {
  CLOCK_IN:    "Iniciar jornada",
  BREAK_START: "Iniciar descanso",
  BREAK_END:   "Volver del descanso",
  LUNCH_START: "Iniciar comida",
  LUNCH_END:   "Volver de comida",
  CLOCK_OUT:   "Finalizar jornada",
};

const BUTTON_VARIANT: Record<EventType, "primary" | "secondary" | "destructive"> = {
  CLOCK_IN:    "primary",
  BREAK_START: "secondary",
  BREAK_END:   "primary",
  LUNCH_START: "secondary",
  LUNCH_END:   "primary",
  CLOCK_OUT:   "destructive",
};

const VARIANT_CLASSES: Record<"primary" | "secondary" | "destructive", string> = {
  // Primary = naranja corporativo Acerca
  primary:
    "bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500/40",
  // Secondary = contorno con texto navy
  secondary:
    "bg-white text-navy-500 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-300/60",
  // Destructive = rojo (cerrar jornada es una acción seria)
  destructive:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40",
};

export default function ClockButtons({ state, onAction }: Props) {
  const [pending, setPending] = useState<EventType | null>(null);
  const allowed = getAllowedEvents(state);

  async function handle(eventType: EventType) {
    if (pending) return;

    if (eventType === "CLOCK_OUT") {
      const ok = window.confirm(
        "¿Seguro que quieres finalizar la jornada? No podrás registrar más eventos hoy."
      );
      if (!ok) return;
    }

    setPending(eventType);
    try {
      await onAction(eventType);
    } finally {
      setPending(null);
    }
  }

  if (state === "FINISHED") return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {allowed.map((event) => {
        const variant = BUTTON_VARIANT[event];
        const isPending = pending === event;
        return (
          <button
            key={event}
            onClick={() => handle(event)}
            disabled={pending !== null}
            className={cn(
              "h-16 rounded-xl text-base font-semibold shadow-sm transition",
              "focus:outline-none focus-visible:ring-4 disabled:opacity-60 disabled:cursor-not-allowed",
              VARIANT_CLASSES[variant]
            )}
          >
            {isPending ? "Registrando..." : BUTTON_LABELS[event]}
          </button>
        );
      })}
    </div>
  );
}
