"use client";

import { EVENT_LABELS_ES, type TimeEvent } from "@/lib/validations/clock";
import { formatHM } from "@/lib/time";

export default function TodayEvents({ events }: { events: TimeEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        Aún no hay registros hoy.
      </p>
    );
  }

  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.event_timestamp).getTime() -
      new Date(b.event_timestamp).getTime()
  );

  return (
    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white overflow-hidden">
      {sorted.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between px-4 py-3 text-sm"
        >
          <span className="font-mono tabular-nums text-slate-700 w-16">
            {formatHM(e.event_timestamp)}
          </span>
          <span className="flex-1 ml-4 text-slate-900">
            {EVENT_LABELS_ES[e.event_type]}
          </span>
        </li>
      ))}
    </ul>
  );
}
