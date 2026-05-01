import ExcelJS from "exceljs";
import { formatInTimeZone } from "date-fns-tz";
import type { TimeEvent } from "@/lib/validations/clock";
import type { DailySummaryRow } from "@/lib/admin/queries";

// =========================================================================
// Paleta corporativa (consistente con la app y con las plantillas Python)
// =========================================================================
const NAVY         = "FF283040";   // ARGB con alpha FF
const ORANGE       = "FFF88000";
const ORANGE_LIGHT = "FFFFF1E0";
const GREY_LIGHT   = "FFF8FAFC";
const GREY_BORDER  = "FFE2E8F0";
const WHITE        = "FFFFFFFF";
const TEXT_DARK    = "FF0F172A";
const TEXT_MUTED   = "FF64748B";

const FONT_NAME = "Arial";
const TZ        = "Europe/Madrid";

const EVENT_ES: Record<string, string> = {
  CLOCK_IN:    "Inicio de jornada",
  BREAK_START: "Inicio de descanso",
  BREAK_END:   "Vuelta de descanso",
  LUNCH_START: "Inicio de comida",
  LUNCH_END:   "Vuelta de comida",
  CLOCK_OUT:   "Fin de jornada",
};

// =========================================================================
// Helpers de estilo
// =========================================================================
type Cell = ExcelJS.Cell;

function applyBorder(cell: Cell): void {
  cell.border = {
    top:    { style: "thin", color: { argb: GREY_BORDER } },
    bottom: { style: "thin", color: { argb: GREY_BORDER } },
    left:   { style: "thin", color: { argb: GREY_BORDER } },
    right:  { style: "thin", color: { argb: GREY_BORDER } },
  };
}

function styleHeaderCell(cell: Cell): void {
  cell.font = { name: FONT_NAME, color: { argb: WHITE }, bold: true, size: 11 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  applyBorder(cell);
}

function styleZebraBody(
  cell: Cell,
  zebra: boolean,
  align: "left" | "center" = "left",
  font?: Partial<ExcelJS.Font>
): void {
  cell.font = { name: FONT_NAME, color: { argb: TEXT_DARK }, size: 10, ...font };
  if (zebra) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREY_LIGHT } };
  }
  cell.alignment = { horizontal: align, vertical: "middle" };
  applyBorder(cell);
}

function styleTitleRow(cell: Cell): void {
  cell.font = { name: FONT_NAME, color: { argb: NAVY }, bold: true, size: 16 };
  cell.alignment = { horizontal: "left", vertical: "middle" };
}

function styleSubtitle(cell: Cell): void {
  cell.font = { name: FONT_NAME, color: { argb: TEXT_MUTED }, size: 10 };
}

function setColumnWidths(ws: ExcelJS.Worksheet, widths: number[]): void {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

// =========================================================================
// Excel 1 — Eventos detallados
// =========================================================================
export async function buildEventsWorkbook(
  events: TimeEvent[],
  filters: { dateFrom: string; dateTo: string; emails?: string[] | null }
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Acerca Clock";
  wb.created = new Date();

  // ---- Hoja Eventos ----
  const ws = wb.addWorksheet("Eventos");

  // Banner (filas 1-3)
  ws.mergeCells("A1:I1");
  ws.getCell("A1").value = "Acerca Clock — Registro de fichajes";
  styleTitleRow(ws.getCell("A1"));
  ws.getRow(1).height = 24;

  ws.mergeCells("A2:I2");
  const filterDesc = describeFilters(filters);
  ws.getCell("A2").value =
    `Rango: ${filterDesc}.  Generado: ${formatInTimeZone(new Date(), TZ, "yyyy-MM-dd HH:mm")} (Europe/Madrid). Registros inmutables.`;
  styleSubtitle(ws.getCell("A2"));
  ws.getRow(3).height = 6;

  // Cabeceras (fila 4)
  const HEADER_ROW = 4;
  const headers = [
    "Email",
    "Nombre completo",
    "Fecha (Madrid)",
    "Hora (Madrid)",
    "Evento",
    "Acción",
    "Timestamp UTC",
    "IP origen",
    "Zona horaria",
  ];
  headers.forEach((h, i) => {
    const c = ws.getCell(HEADER_ROW, i + 1);
    c.value = h;
    styleHeaderCell(c);
  });
  ws.getRow(HEADER_ROW).height = 22;

  // Datos
  events.forEach((e, i) => {
    const row = HEADER_ROW + 1 + i;
    const zebra = i % 2 === 1;

    ws.getCell(row, 1).value = e.email;
    ws.getCell(row, 2).value = e.full_name ?? "";
    ws.getCell(row, 3).value = e.local_date;
    ws.getCell(row, 4).value = e.local_time;
    ws.getCell(row, 5).value = e.event_type;
    ws.getCell(row, 6).value = EVENT_ES[e.event_type] ?? e.event_type;
    ws.getCell(row, 7).value = e.event_timestamp;
    ws.getCell(row, 8).value = e.ip_address ?? "";
    ws.getCell(row, 9).value = e.timezone ?? "Europe/Madrid";

    for (let col = 1; col <= 9; col++) {
      const cell = ws.getCell(row, col);
      const isMono = col === 4 || col === 7 || col === 8;
      const isHighlight = col === 6 && (e.event_type === "CLOCK_IN" || e.event_type === "CLOCK_OUT");
      styleZebraBody(cell, zebra, "left", {
        ...(isMono ? { name: "Consolas" } : {}),
        ...(isHighlight ? { bold: true, color: { argb: NAVY } } : {}),
      });
    }
    // Formatos numéricos
    ws.getCell(row, 3).numFmt = "yyyy-mm-dd";
    ws.getCell(row, 4).numFmt = "hh:mm:ss";
  });

  setColumnWidths(ws, [32, 28, 14, 12, 14, 22, 24, 16, 16]);
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: HEADER_ROW }];
  if (events.length > 0) {
    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to:   { row: HEADER_ROW + events.length, column: 9 },
    };
  }

  // ---- Hoja Leyenda ----
  addEventsLegendSheet(wb);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

function addEventsLegendSheet(wb: ExcelJS.Workbook): void {
  const ws = wb.addWorksheet("Leyenda");

  ws.mergeCells("A1:B1");
  ws.getCell("A1").value = "Leyenda de columnas";
  styleTitleRow(ws.getCell("A1"));
  ws.getRow(1).height = 24;

  ws.getCell("A3").value = "Columna";
  ws.getCell("B3").value = "Descripción";
  styleHeaderCell(ws.getCell("A3"));
  styleHeaderCell(ws.getCell("B3"));
  ws.getRow(3).height = 22;

  const rows: [string, string][] = [
    ["Email",            "Cuenta corporativa Google del trabajador (login Workspace)."],
    ["Nombre completo",  "Nombre del usuario tal y como lo devuelve Google al autenticarse."],
    ["Fecha (Madrid)",   "Fecha del fichaje en zona horaria Europe/Madrid (clave para RRHH)."],
    ["Hora (Madrid)",    "Hora local del fichaje en Madrid."],
    ["Evento",           "Código interno: CLOCK_IN, BREAK_START, BREAK_END, LUNCH_START, LUNCH_END, CLOCK_OUT."],
    ["Acción",           "Traducción en español del evento."],
    ["Timestamp UTC",    "Marca de tiempo absoluta (auditoría, inspecciones)."],
    ["IP origen",        "IP pública desde la que se registró el fichaje."],
    ["Zona horaria",     "Siempre Europe/Madrid en esta versión."],
  ];

  rows.forEach(([k, v], i) => {
    const r = i + 4;
    ws.getCell(r, 1).value = k;
    ws.getCell(r, 2).value = v;
    const zebra = i % 2 === 1;
    styleZebraBody(ws.getCell(r, 1), zebra, "left", { bold: true, color: { argb: NAVY }, size: 11 });
    styleZebraBody(ws.getCell(r, 2), zebra, "left");
    ws.getCell(r, 2).alignment = { ...ws.getCell(r, 2).alignment, wrapText: true };
  });

  setColumnWidths(ws, [22, 80]);
}

// =========================================================================
// Excel 2 — Resumen diario
// =========================================================================
export async function buildSummaryWorkbook(
  rows: DailySummaryRow[],
  filters: { dateFrom: string; dateTo: string; emails?: string[] | null }
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Acerca Clock";
  wb.created = new Date();

  const ws = wb.addWorksheet("Resumen diario");

  // Banner
  ws.mergeCells("A1:I1");
  ws.getCell("A1").value = "Acerca Clock — Resumen diario por trabajador";
  styleTitleRow(ws.getCell("A1"));
  ws.getRow(1).height = 24;

  ws.mergeCells("A2:I2");
  const filterDesc = describeFilters(filters);
  ws.getCell("A2").value =
    `Rango: ${filterDesc}.  Generado: ${formatInTimeZone(new Date(), TZ, "yyyy-MM-dd HH:mm")} (Europe/Madrid).  Bruto = Fin − Inicio.  Neto = Bruto − Descansos − Comida.`;
  styleSubtitle(ws.getCell("A2"));

  // Cabeceras
  const HEADER_ROW = 4;
  const headers = [
    "Email",
    "Nombre completo",
    "Fecha",
    "Inicio jornada",
    "Fin jornada",
    "Descansos (min)",
    "Comida (min)",
    "Bruto (min)",
    "Neto (min)",
  ];
  headers.forEach((h, i) => {
    const c = ws.getCell(HEADER_ROW, i + 1);
    c.value = h;
    styleHeaderCell(c);
  });
  ws.getRow(HEADER_ROW).height = 32;

  // Filas. La hora de inicio/fin la mostramos como hora local Madrid.
  rows.forEach((r, i) => {
    const row = HEADER_ROW + 1 + i;
    const zebra = i % 2 === 1;

    ws.getCell(row, 1).value = r.email;
    ws.getCell(row, 2).value = r.full_name ?? "";
    ws.getCell(row, 3).value = r.local_date;

    // Hora local Madrid del primer CLOCK_IN / último CLOCK_OUT
    ws.getCell(row, 4).value = r.first_clock_in
      ? formatInTimeZone(new Date(r.first_clock_in), TZ, "HH:mm")
      : "";
    ws.getCell(row, 5).value = r.last_clock_out
      ? formatInTimeZone(new Date(r.last_clock_out), TZ, "HH:mm")
      : "";

    ws.getCell(row, 6).value = Math.round(r.break_minutes ?? 0);
    ws.getCell(row, 7).value = Math.round(r.lunch_minutes ?? 0);

    // Bruto y Neto: hardcodeamos el valor calculado por Supabase
    // (la vista ya hace el cálculo).
    ws.getCell(row, 8).value = r.gross_minutes != null ? Math.round(r.gross_minutes) : "";
    ws.getCell(row, 9).value =
      r.net_worked_minutes != null ? Math.round(r.net_worked_minutes) : "";

    for (let col = 1; col <= 9; col++) {
      const cell = ws.getCell(row, col);
      const align = col >= 3 ? "center" : "left";
      const isMono = col >= 3;
      const isAccent = col === 9 && r.net_worked_minutes != null;
      styleZebraBody(cell, zebra, align, {
        ...(isMono ? { name: "Consolas" } : {}),
        ...(isAccent ? { bold: true, color: { argb: ORANGE } } : {}),
      });
    }
    // Formatos
    ws.getCell(row, 3).numFmt = "yyyy-mm-dd";
    ws.getCell(row, 6).numFmt = "0";
    ws.getCell(row, 7).numFmt = "0";
    ws.getCell(row, 8).numFmt = "0";
    ws.getCell(row, 9).numFmt = "0";
  });

  // Fila Totales
  if (rows.length > 0) {
    const startRow = HEADER_ROW + 1;
    const lastRow = HEADER_ROW + rows.length;
    const totalRow = lastRow + 2;

    ws.getCell(totalRow, 1).value = "Totales";
    ws.getCell(totalRow, 6).value = { formula: `SUM(F${startRow}:F${lastRow})` };
    ws.getCell(totalRow, 7).value = { formula: `SUM(G${startRow}:G${lastRow})` };
    ws.getCell(totalRow, 8).value = { formula: `SUM(H${startRow}:H${lastRow})` };
    ws.getCell(totalRow, 9).value = { formula: `SUM(I${startRow}:I${lastRow})` };

    for (let col = 1; col <= 9; col++) {
      const cell = ws.getCell(totalRow, col);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ORANGE_LIGHT } };
      applyBorder(cell);
      cell.alignment = { horizontal: col >= 3 ? "center" : "left", vertical: "middle" };
      cell.numFmt = "0";
      if (col === 1) {
        cell.font = { name: FONT_NAME, color: { argb: NAVY }, bold: true, size: 11 };
      } else if (col === 9) {
        cell.font = { name: FONT_NAME, color: { argb: ORANGE }, bold: true, size: 11 };
      } else if (col >= 6) {
        cell.font = { name: FONT_NAME, color: { argb: NAVY }, bold: true, size: 11 };
      } else {
        cell.font = { name: FONT_NAME, color: { argb: TEXT_DARK }, size: 10 };
      }
    }

    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to:   { row: lastRow, column: 9 },
    };
  }

  setColumnWidths(ws, [32, 28, 14, 14, 14, 16, 14, 14, 14]);
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: HEADER_ROW }];

  addSummaryLegendSheet(wb);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

function addSummaryLegendSheet(wb: ExcelJS.Workbook): void {
  const ws = wb.addWorksheet("Leyenda");

  ws.mergeCells("A1:B1");
  ws.getCell("A1").value = "Leyenda de columnas";
  styleTitleRow(ws.getCell("A1"));
  ws.getRow(1).height = 24;

  ws.getCell("A3").value = "Columna";
  ws.getCell("B3").value = "Descripción";
  styleHeaderCell(ws.getCell("A3"));
  styleHeaderCell(ws.getCell("B3"));
  ws.getRow(3).height = 22;

  const rows: [string, string][] = [
    ["Email",            "Cuenta corporativa del trabajador."],
    ["Nombre completo",  "Nombre del usuario tal como lo devuelve Google."],
    ["Fecha",            "Día en zona horaria Europe/Madrid."],
    ["Inicio jornada",   "Hora local Madrid del primer CLOCK_IN del día."],
    ["Fin jornada",      "Hora local Madrid del último CLOCK_OUT. Vacío si no se cerró."],
    ["Descansos (min)",  "Suma de minutos de todos los descansos del día."],
    ["Comida (min)",     "Minutos de comida del día (puede ser 0)."],
    ["Bruto (min)",      "Fin − Inicio en minutos. Tiempo total de presencia."],
    ["Neto (min)",       "Bruto − Descansos − Comida. Tiempo efectivo trabajado."],
  ];

  rows.forEach(([k, v], i) => {
    const r = i + 4;
    ws.getCell(r, 1).value = k;
    ws.getCell(r, 2).value = v;
    const zebra = i % 2 === 1;
    styleZebraBody(ws.getCell(r, 1), zebra, "left", { bold: true, color: { argb: NAVY }, size: 11 });
    styleZebraBody(ws.getCell(r, 2), zebra, "left");
    ws.getCell(r, 2).alignment = { ...ws.getCell(r, 2).alignment, wrapText: true };
  });

  setColumnWidths(ws, [22, 80]);
}

// =========================================================================
// Helpers
// =========================================================================
function describeFilters(f: { dateFrom: string; dateTo: string; emails?: string[] | null }): string {
  const range = f.dateFrom === f.dateTo ? f.dateFrom : `${f.dateFrom} → ${f.dateTo}`;
  const who = f.emails && f.emails.length > 0 ? `${f.emails.length} trabajador(es)` : "todos los trabajadores";
  return `${range}, ${who}`;
}

/**
 * Devuelve un nombre de fichero descriptivo y URL-safe.
 */
export function buildFilename(kind: "eventos" | "resumen", dateFrom: string, dateTo: string): string {
  const range = dateFrom === dateTo ? dateFrom : `${dateFrom}_${dateTo}`;
  return `acerca-clock-${kind}-${range}.xlsx`;
}
