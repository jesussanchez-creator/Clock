"use client";

import { useState } from "react";
import {
  STATE_LABELS_ES,
  computeCurrentState,
  type ClockState,
  type EventType,
  type TimeEvent,
} from "@/lib/validations/clock";
import { formatLongDateEs } from "@/lib/time";
import LiveClock from "@/components/LiveClock";
import ClockButtons from "@/components/ClockButtons";
import TodayEvents from "@/components/TodayEvents";
import DaySummary from "@/components/DaySummary";
import LogoutLink from "@/components/LogoutLink";
import Logo from "@/components/Logo";
import StateTimer from "@/components/StateTimer";

interface Props {
  initialUser: { id: string; email: string; fullName: string | null };
  initialEvents: TimeEvent[];
  initialState: ClockState;
  ip: string | null;
}

const STATE_BADGE_CLASSES: Record<ClockState, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700 border-slate-200",
  WORKING:     "bg-emerald-100 text-emerald-800 border-emerald-200",
  ON_BREAK:    "bg-orange-100 text-orange-800 border-orange-200",
  ON_LUNCH:    "bg-orange-100 text-orange-800 border-orange-200",
  FINISHED:    "bg-slate-200 text-slate-700 border-slate-300",
};

export default function Dashboard({
  initialUser,
  initialEvents,
  initialState,
  ip,
}: Props) {
  const [events, setEvents] = useState<TimeEvent[]>(initialEvents);
  const [state, setState] = useState<ClockState>(initialState);
  const [error, setError] = useState<string | null>(null);

  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Acerca Clock";
  const today = formatLongDateEs(new Date());
  const displayName = initialUser.fullName ?? initialUser.email;

  async function handleAction(eventType: EventType) {
    setError(null);
    try {
      const res = await fetch("/api/clock-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: eventType }),
      });

      const data = await res.json();

      if (!res.ok) {
        const reason =
          data?.reason ??
          mapErrorCode(data?.error) ??
          "No se ha podido registrar el evento.";
        setError(reason);
        return;
      }

      const newEvents = [...events, data.event as TimeEvent];
      setEvents(newEvents);
      setState(computeCurrentState(newEvents));
    } catch (e) {
      console.error(e);
      setError("Error de red. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo height={32} />
            <div className="hidden sm:block h-8 w-px bg-slate-200" />
            <div>
              <p className="text-sm font-semibold text-navy-500">{appName}</p>
              <p className="text-xs text-slate-500">
                {displayName} · {initialUser.email}
              </p>
            </div>
          </div>
          <LogoutLink />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl bg-white border border-slate-200 p-6">
            <p className="text-sm text-slate-500 capitalize">{today}</p>
            <div className="mt-1">
              <LiveClock />
              <span className="ml-2 text-sm text-slate-500">
                hora de España
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col justify-center">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
              Estado actual
            </p>
            <span
              className={
                "inline-flex w-fit items-center px-3 py-1 rounded-full text-sm font-semibold border " +
                STATE_BADGE_CLASSES[state]
              }
            >
              {STATE_LABELS_ES[state]}
            </span>
            <StateTimer state={state} events={events} />
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {state !== "FINISHED" && (
          <section className="rounded-2xl bg-white border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-navy-500 mb-4">
              Registrar fichaje
            </h2>
            <ClockButtons state={state} onAction={handleAction} />
          </section>
        )}

        {state === "FINISHED" && <DaySummary events={events} />}

        <section>
          <h2 className="text-base font-semibold text-navy-500 mb-3">
            Histórico de hoy
          </h2>
          <TodayEvents events={events} />
        </section>

        <footer className="pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>IP de oficina: {ip ?? "—"}</span>
          <span>Los registros son inmutables.</span>
        </footer>
      </main>
    </div>
  );
}

function mapErrorCode(code?: string): string | null {
  switch (code) {
    case "UNAUTHENTICATED":
      return "Tu sesión ha expirado. Vuelve a iniciar sesión.";
    case "INVALID_DOMAIN":
      return "Tu cuenta no pertenece al dominio corporativo autorizado.";
    case "IP_NOT_ALLOWED":
      return "No puedes fichar desde esta red.";
    case "INVALID_TRANSITION":
      return "Esa acción no está permitida en el estado actual.";
    case "INVALID_EVENT_TYPE":
      return "Tipo de evento desconocido.";
    case "DB_READ_ERROR":
    case "DB_WRITE_ERROR":
      return "Error de base de datos. Inténtalo de nuevo.";
    default:
      return null;
  }
}
