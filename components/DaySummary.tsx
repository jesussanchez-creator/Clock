"use client";

import { computeDaySummary, type TimeEvent } from "@/lib/validations/clock";
import { formatDuration, formatHM } from "@/lib/time";

export default function DaySummary({ events }: { events: TimeEvent[] }) {
  const summary = computeDaySummary(events);

  if (!summary.startIso || !summary.endIso) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white text-sm font-bold">
          ✓
        </span>
        <h3 className="text-lg font-semibold text-emerald-900">
          Jornada finalizada
        </h3>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Row label="Inicio" value={formatHM(summary.startIso)} />
        <Row label="Fin" value={formatHM(summary.endIso)} />
        <Row label="Tiempo bruto" value={formatDuration(summary.grossMinutes)} />
        <Row label="Descansos" value={formatDuration(summary.breakMinutes)} />
        <Row label="Comida" value={formatDuration(summary.lunchMinutes)} />
        <Row
          label="Tiempo neto trabajado"
          value={formatDuration(summary.netMinutes)}
          highlight
        />
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-emerald-100 last:border-b-0 pb-2 last:pb-0">
      <dt className="text-emerald-800">{label}</dt>
      <dd
        className={
          highlight
            ? "font-mono tabular-nums text-emerald-900 font-bold text-base"
            : "font-mono tabular-nums text-emerald-900 font-medium"
        }
      >
        {value}
      </dd>
    </div>
  );
}
