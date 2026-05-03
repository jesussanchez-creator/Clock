"use client";

import { useEffect, useMemo, useState } from "react";
import Logo from "@/components/Logo";
import LogoutLink from "@/components/LogoutLink";

interface Worker {
  email: string;
  full_name: string | null;
}

interface Props {
  email: string;
}

export default function AdminPanel({ email }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const monthAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [downloading, setDownloading] = useState<null | "summary" | "events">(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/workers", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancel) setWorkers(json.workers ?? []);
      } catch (e) {
        if (!cancel) setError("No se pudo cargar la lista de trabajadores.");
        console.error(e);
      } finally {
        if (!cancel) setLoadingWorkers(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workers;
    return workers.filter(
      (w) =>
        w.email.toLowerCase().includes(q) ||
        (w.full_name ?? "").toLowerCase().includes(q)
    );
  }, [workers, search]);

  const allSelected =
    workers.length > 0 && selectedEmails.length === workers.length;

  function toggleEmail(em: string) {
    setSelectedEmails((prev) =>
      prev.includes(em) ? prev.filter((x) => x !== em) : [...prev, em]
    );
  }

  function toggleAll() {
    if (allSelected) setSelectedEmails([]);
    else setSelectedEmails(workers.map((w) => w.email));
  }

  async function download(kind: "summary" | "events") {
    if (!from || !to) {
      setError("Indica un rango de fechas válido.");
      return;
    }
    if (from > to) {
      setError("La fecha 'desde' no puede ser posterior a 'hasta'.");
      return;
    }
    setError(null);
    setDownloading(kind);
    try {
      const params = new URLSearchParams({ from, to });
      if (selectedEmails.length > 0) {
        params.set("emails", selectedEmails.join(","));
      }
      const endpoint =
        kind === "summary"
          ? "/api/admin/export-summary"
          : "/api/admin/export-events";
      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename =
        match?.[1] ??
        `${kind === "summary" ? "resumen-diario" : "eventos"}_${from}_a_${to}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("La descarga ha fallado. Revisa los filtros e inténtalo de nuevo.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo height={36} />
            <div>
              <p className="text-sm text-slate-500">Panel administración</p>
              <p className="text-base font-semibold text-navy-500">
                Acerca Clock
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a
              href="/"
              className="text-slate-600 hover:text-navy-500"
            >
              ← Volver al fichador
            </a>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">{email}</span>
            <LogoutLink />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Filtros */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-lg font-semibold text-navy-500 mb-1">
            Descarga de fichajes
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Filtra por rango de fechas y por trabajadores. Si no seleccionas
            ningún trabajador, se incluyen todos.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <label className="text-sm">
              <span className="block text-slate-700 mb-1">Desde</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </label>
            <label className="text-sm">
              <span className="block text-slate-700 mb-1">Hasta</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </label>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Trabajadores
              {selectedEmails.length > 0 && (
                <span className="ml-2 text-slate-500 font-normal">
                  ({selectedEmails.length} seleccionados)
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={toggleAll}
              disabled={loadingWorkers || workers.length === 0}
              className="text-xs text-navy-500 hover:underline disabled:text-slate-400"
            >
              {allSelected ? "Limpiar selección" : "Seleccionar todos"}
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
          />

          <div className="border border-slate-200 rounded-lg max-h-72 overflow-y-auto bg-slate-50">
            {loadingWorkers ? (
              <p className="px-3 py-6 text-sm text-slate-500 text-center">
                Cargando trabajadores…
              </p>
            ) : filteredWorkers.length === 0 ? (
              <p className="px-3 py-6 text-sm text-slate-500 text-center">
                No hay trabajadores
                {workers.length > 0 ? " que coincidan." : " con eventos registrados todavía."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {filteredWorkers.map((w) => (
                  <li key={w.email}>
                    <label className="flex items-center gap-3 px-3 py-2 hover:bg-white cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedEmails.includes(w.email)}
                        onChange={() => toggleEmail(w.email)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="flex-1">
                        <span className="font-medium text-slate-800">
                          {w.full_name ?? w.email}
                        </span>
                        {w.full_name && (
                          <span className="ml-2 text-slate-500">{w.email}</span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Botones */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-navy-500 mb-1">
            Exportar a Excel
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            Cada botón descarga un fichero distinto. Puedes descargar ambos.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => download("summary")}
              disabled={downloading !== null}
              className="rounded-xl bg-navy-500 text-white px-4 py-3 text-sm font-medium hover:bg-navy-600 transition disabled:opacity-60"
            >
              {downloading === "summary"
                ? "Generando…"
                : "📊 Descargar resumen diario"}
            </button>
            <button
              type="button"
              onClick={() => download("events")}
              disabled={downloading !== null}
              className="rounded-xl border border-navy-500 text-navy-500 px-4 py-3 text-sm font-medium hover:bg-navy-50 transition disabled:opacity-60"
            >
              {downloading === "events"
                ? "Generando…"
                : "📋 Descargar eventos detallados"}
            </button>
          </div>
          <ul className="mt-4 text-xs text-slate-500 leading-relaxed list-disc list-inside">
            <li>
              <strong>Resumen diario:</strong> una fila por trabajador y día,
              con inicio, fin, descansos, comida y horas netas.
            </li>
            <li>
              <strong>Eventos detallados:</strong> cada pulsación de botón
              (clock-in, descansos, comida, clock-out) con su hora exacta e IP.
            </li>
          </ul>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
