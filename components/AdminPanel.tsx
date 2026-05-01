"use client";

import { useMemo, useState } from "react";
import Logo from "@/components/Logo";
import LogoutLink from "@/components/LogoutLink";
import { cn } from "@/lib/utils";

interface Agent {
  email: string;
  full_name: string | null;
}

interface Props {
  currentUser: { email: string; fullName: string | null };
  initialAgents: Agent[];
  today: string; // yyyy-MM-dd, hora local Madrid del día actual
}

export default function AdminPanel({ currentUser, initialAgents, today }: Props) {
  const [dateFrom, setDateFrom] = useState<string>(today);
  const [dateTo,   setDateTo]   = useState<string>(today);

  // Lista de agentes y selección. Por defecto: TODOS marcados.
  const [agents] = useState<Agent[]>(initialAgents);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(
    () => new Set(initialAgents.map((a) => a.email))
  );

  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<"events" | "summary" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.trim().toLowerCase();
    return agents.filter(
      (a) =>
        a.email.toLowerCase().includes(q) ||
        (a.full_name ?? "").toLowerCase().includes(q)
    );
  }, [agents, search]);

  const allSelected = selectedEmails.size === agents.length && agents.length > 0;
  const noneSelected = selectedEmails.size === 0;

  function toggleAgent(email: string) {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function selectAll() {
    setSelectedEmails(new Set(agents.map((a) => a.email)));
  }
  function selectNone() {
    setSelectedEmails(new Set());
  }
  function selectFiltered() {
    setSelectedEmails(new Set(filteredAgents.map((a) => a.email)));
  }

  async function handleDownload(kind: "events" | "summary") {
    setError(null);
    setSuccessMsg(null);

    if (!dateFrom || !dateTo) {
      setError("Selecciona ambas fechas (Desde y Hasta).");
      return;
    }
    if (dateFrom > dateTo) {
      setError("La fecha 'Desde' no puede ser posterior a 'Hasta'.");
      return;
    }
    if (noneSelected) {
      setError("Selecciona al menos un trabajador (o pulsa 'Todos').");
      return;
    }

    setDownloading(kind);
    try {
      // Si están todos seleccionados mandamos lista vacía para que el server
      // interprete "todos" sin recortes redundantes.
      const emails = allSelected ? [] : Array.from(selectedEmails);

      const res = await fetch("/api/admin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, dateFrom, dateTo, emails }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const code = (data as { error?: string }).error ?? "UNKNOWN";
        setError(mapErrorCode(code));
        return;
      }

      // Forzar descarga.
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const filename =
        getFilenameFromHeader(res.headers.get("content-disposition")) ??
        defaultFilename(kind, dateFrom, dateTo);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMsg(`Descargado: ${filename}`);
    } catch (e) {
      console.error(e);
      setError("Error de red durante la descarga.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo height={32} />
            <div className="hidden sm:block h-8 w-px bg-slate-200" />
            <div>
              <p className="text-sm font-semibold text-navy-500">
                Acerca Clock — Panel admin
              </p>
              <p className="text-xs text-slate-500">
                {currentUser.fullName ?? currentUser.email} · {currentUser.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-slate-600 hover:text-navy-500 underline underline-offset-4"
            >
              Volver al fichador
            </a>
            <LogoutLink />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h1 className="text-2xl font-semibold text-navy-500 tracking-tight">
            Exportación de fichajes
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Configura los filtros y descarga los Excel ya formateados con los
            datos solicitados.
          </p>
        </section>

        {/* Filtros */}
        <section className="rounded-2xl bg-white border border-slate-200 p-6 space-y-6">
          {/* Fechas */}
          <div>
            <h2 className="text-base font-semibold text-navy-500 mb-3">
              Rango de fechas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs text-slate-500 uppercase tracking-wider">
                  Desde
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full h-11 rounded-lg border border-slate-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500 uppercase tracking-wider">
                  Hasta
                </span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 w-full h-11 rounded-lg border border-slate-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                />
              </label>
            </div>
            <DatePresets onPick={(from, to) => { setDateFrom(from); setDateTo(to); }} today={today} />
          </div>

          <div className="border-t border-slate-100" />

          {/* Trabajadores */}
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-base font-semibold text-navy-500">
                Trabajadores
                <span className="ml-2 text-xs font-normal text-slate-500">
                  ({selectedEmails.size} de {agents.length} seleccionados)
                </span>
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-3 py-1.5 rounded-md text-navy-500 border border-slate-300 hover:bg-slate-50"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="px-3 py-1.5 rounded-md text-navy-500 border border-slate-300 hover:bg-slate-50"
                >
                  Ninguno
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="Buscar por nombre o email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 mb-3"
            />

            {search.trim() && (
              <div className="mb-2 text-xs text-slate-500 flex items-center gap-2">
                <span>{filteredAgents.length} coincidencia(s)</span>
                {filteredAgents.length > 0 && (
                  <button
                    type="button"
                    onClick={selectFiltered}
                    className="text-orange-600 hover:text-orange-700 underline underline-offset-2"
                  >
                    Seleccionar coincidencias
                  </button>
                )}
              </div>
            )}

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filteredAgents.length === 0 && (
                <p className="px-4 py-8 text-sm text-slate-500 text-center">
                  No hay trabajadores que coincidan.
                </p>
              )}
              {filteredAgents.map((a) => {
                const checked = selectedEmails.has(a.email);
                return (
                  <label
                    key={a.email}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50",
                      checked && "bg-orange-50/50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAgent(a.email)}
                      className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500/40"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 truncate">
                        {a.full_name ?? a.email}
                      </p>
                      {a.full_name && (
                        <p className="text-xs text-slate-500 truncate">
                          {a.email}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        {/* Errores y éxito */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMsg}
          </div>
        )}

        {/* Descargas */}
        <section className="rounded-2xl bg-white border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-navy-500 mb-1">
            Descargar Excel
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            El fichero se descargará ya con el formato corporativo aplicado:
            cabeceras, totales y leyenda.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DownloadCard
              title="Resumen diario"
              subtitle="Una fila por trabajador y día. Bruto, Neto, descansos y comida."
              hint="Recomendado para nóminas."
              loading={downloading === "summary"}
              disabled={downloading !== null}
              onClick={() => handleDownload("summary")}
              variant="primary"
            />
            <DownloadCard
              title="Eventos detallados"
              subtitle="Una fila por fichaje individual. Auditoría e inspecciones."
              hint="Incluye IP origen y timestamp UTC."
              loading={downloading === "events"}
              disabled={downloading !== null}
              onClick={() => handleDownload("events")}
              variant="secondary"
            />
          </div>
        </section>

        <footer className="pt-4 border-t border-slate-200 text-xs text-slate-500">
          Acceso restringido. La lista de administradores se gestiona en la
          variable <code className="font-mono text-slate-700">ADMIN_EMAILS</code>.
        </footer>
      </main>
    </div>
  );
}

// =========================================================================
// Subcomponentes
// =========================================================================

function DatePresets({
  onPick,
  today,
}: {
  onPick: (from: string, to: string) => void;
  today: string;
}) {
  // Helpers de fecha en Madrid (suficiente con manipular el string yyyy-MM-dd
  // a partir del today que ya viene en zona Madrid desde el server).
  const todayDate = new Date(today + "T00:00:00");

  function isoFromDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const presets: { label: string; from: string; to: string }[] = [
    { label: "Hoy", from: today, to: today },
    {
      label: "Últimos 7 días",
      from: isoFromDate(new Date(todayDate.getTime() - 6 * 86400000)),
      to: today,
    },
    {
      label: "Mes en curso",
      from: isoFromDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)),
      to: today,
    },
    (() => {
      const firstThisMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
      const lastPrevMonth  = new Date(firstThisMonth.getTime() - 86400000);
      const firstPrevMonth = new Date(lastPrevMonth.getFullYear(), lastPrevMonth.getMonth(), 1);
      return {
        label: "Mes anterior",
        from: isoFromDate(firstPrevMonth),
        to:   isoFromDate(lastPrevMonth),
      };
    })(),
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {presets.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onPick(p.from, p.to)}
          className="px-3 py-1.5 rounded-md text-xs text-navy-500 border border-slate-300 hover:bg-slate-50"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function DownloadCard({
  title,
  subtitle,
  hint,
  loading,
  disabled,
  onClick,
  variant,
}: {
  title: string;
  subtitle: string;
  hint: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  variant: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-left rounded-xl border p-5 transition disabled:opacity-60 disabled:cursor-not-allowed",
        "focus:outline-none focus-visible:ring-4",
        variant === "primary"
          ? "bg-orange-500 text-white border-orange-600 hover:bg-orange-600 focus-visible:ring-orange-500/40"
          : "bg-white text-navy-500 border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-300/60"
      )}
    >
      <p className="text-base font-semibold mb-1">{title}</p>
      <p className={cn("text-sm leading-relaxed mb-2", variant === "primary" ? "text-white/85" : "text-slate-600")}>
        {subtitle}
      </p>
      <p className={cn("text-xs", variant === "primary" ? "text-white/75" : "text-slate-500")}>
        {hint}
      </p>
      <p className="text-sm font-semibold mt-3">
        {loading ? "Generando…" : "Descargar Excel ↓"}
      </p>
    </button>
  );
}

// =========================================================================
// Helpers
// =========================================================================
function defaultFilename(kind: "events" | "summary", from: string, to: string): string {
  const range = from === to ? from : `${from}_${to}`;
  return `acerca-clock-${kind === "summary" ? "resumen" : "eventos"}-${range}.xlsx`;
}

function getFilenameFromHeader(h: string | null): string | null {
  if (!h) return null;
  const m = /filename="([^"]+)"/.exec(h);
  return m?.[1] ?? null;
}

function mapErrorCode(code: string): string {
  switch (code) {
    case "UNAUTHENTICATED": return "Tu sesión ha expirado. Vuelve a iniciar sesión.";
    case "FORBIDDEN":       return "No tienes permisos para esta acción.";
    case "INVALID_DATE":    return "Las fechas tienen formato incorrecto.";
    case "DATE_RANGE_INVERTED": return "El rango de fechas está invertido.";
    case "INVALID_KIND":    return "Tipo de exportación desconocido.";
    case "EXPORT_FAILED":   return "Ha fallado la generación del Excel. Inténtalo de nuevo.";
    default:                return "Ha ocurrido un error inesperado.";
  }
}
