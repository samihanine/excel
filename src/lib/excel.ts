import type {
  Excel,
  ExcelCell,
  ExcelColumn,
  ExcelStyleRule,
} from "@/artefacts/excel-artefact";
import { evaluateFormula } from "@/lib/math";

export type ExcelRow = Record<string, ExcelCell>;

/** Lignes avec les colonnes `formula` calculées. */
export function computeRows(excel: Excel): ExcelRow[] {
  const formulas = excel.columns.filter((column) => column.formula);
  if (formulas.length === 0) return excel.rows;
  return excel.rows.map((row) => {
    const computed: ExcelRow = { ...row };
    for (const column of formulas) {
      const value = evaluateFormula(column.formula!, computed);
      computed[column.key] = value;
    }
    return computed;
  });
}

export function matchesRule(
  rule: ExcelStyleRule,
  value: ExcelCell | undefined,
) {
  const empty = value === null || value === undefined || value === "";
  if (rule.operator === "empty") return empty;
  if (empty) return false;
  const expected = rule.value;
  switch (rule.operator) {
    case "eq":
      return String(value) === String(expected);
    case "neq":
      return String(value) !== String(expected);
    case "contains":
      return String(value)
        .toLowerCase()
        .includes(String(expected ?? "").toLowerCase());
    default: {
      const left = Number(value);
      const right = Number(expected);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
      if (rule.operator === "gt") return left > right;
      if (rule.operator === "gte") return left >= right;
      if (rule.operator === "lt") return left < right;
      return left <= right;
    }
  }
}

/** Première règle de style qui s'applique à la cellule. */
export function cellBackground(
  excel: Excel,
  key: string,
  value: ExcelCell | undefined,
) {
  return excel.styles.find(
    (rule) => rule.column === key && matchesRule(rule, value),
  )?.background;
}

/** Couleurs ARGB pour l'export .xlsx (charte dorée + états). */
const XLSX_FILLS: Record<ExcelStyleRule["background"], string> = {
  gold: "FFE2D3A8",
  muted: "FFEDEBE4",
  success: "FFD9EAD3",
  warning: "FFFCE8B2",
  danger: "FFF4CCCC",
};

const toKey = (label: string, index: number) => {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+(.)?/g, (_m, c: string | undefined) =>
      c ? c.toUpperCase() : "",
    )
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
  return /^[a-z]/.test(base) ? base : `col${index + 1}${base}`;
};

function inferType(values: ExcelCell[]): ExcelColumn["type"] {
  const filled = values.filter((v) => v !== null && v !== "");
  if (filled.length === 0) return "text";
  if (filled.every((v) => typeof v === "boolean")) return "boolean";
  if (filled.every((v) => typeof v === "number")) return "number";
  if (
    filled.every(
      (v) =>
        typeof v === "string" &&
        !Number.isNaN(Date.parse(v)) &&
        /\d{4}/.test(v),
    )
  )
    return "date";
  return "text";
}

/** Lit la première feuille d'un .xlsx : ligne 1 = en-têtes, puis les lignes. */
export async function importExcelFile(
  file: File,
): Promise<Pick<Excel, "columns" | "rows">> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets.at(0);
  if (!sheet) throw new Error("Le fichier ne contient aucune feuille.");

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.text).trim();
  });
  if (headers.filter(Boolean).length === 0) {
    throw new Error("La première ligne doit contenir les en-têtes.");
  }
  const keys = headers.map((label, index) =>
    toKey(label || `Colonne ${index + 1}`, index),
  );

  const rows: ExcelRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: ExcelRow = {};
    keys.forEach((key, index) => {
      if (!headers[index]) return;
      const cell = row.getCell(index + 1);
      const raw = cell.value;
      let value: ExcelCell = null;
      if (raw instanceof Date) value = raw.toISOString().slice(0, 10);
      else if (
        typeof raw === "number" ||
        typeof raw === "boolean" ||
        typeof raw === "string"
      )
        value = raw;
      else if (raw && typeof raw === "object") {
        // Formule, texte riche, lien… : exceljs fournit le texte affiché.
        const result: unknown = "result" in raw ? raw.result : undefined;
        value =
          result instanceof Date
            ? result.toISOString().slice(0, 10)
            : typeof result === "number" ||
                typeof result === "boolean" ||
                typeof result === "string"
              ? result
              : String(cell.text);
      }
      record[key] = value;
    });
    if (Object.values(record).some((v) => v !== null && v !== ""))
      rows.push(record);
  });

  const columns: ExcelColumn[] = keys
    .map((key, index) => ({
      key,
      label: headers[index],
      type: inferType(rows.map((row) => row[key] ?? null)),
    }))
    .filter((column) => column.label);

  return { columns, rows };
}

/** Génère et télécharge un .xlsx avec les fonds de cellule des règles de style. */
export async function downloadExcel(filename: string, excel: Excel) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(excel.title?.slice(0, 31) || "Feuille 1");
  sheet.columns = excel.columns.map((column) => ({
    header: column.label,
    key: column.key,
    width: Math.max(12, column.label.length + 2),
  }));
  sheet.getRow(1).font = { bold: true };

  const rows = computeRows(excel);
  for (const row of rows) {
    const added = sheet.addRow(
      excel.columns.map((column) => {
        const value = row[column.key];
        return column.type === "date" && typeof value === "string"
          ? new Date(value)
          : value;
      }),
    );
    excel.columns.forEach((column, index) => {
      const background = cellBackground(excel, column.key, row[column.key]);
      if (background) {
        added.getCell(index + 1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: XLSX_FILLS[background] },
        };
      }
      if (column.type === "percent") added.getCell(index + 1).numFmt = "0.0%";
      if (column.type === "currency")
        added.getCell(index + 1).numFmt = "#,##0.00 €";
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Texte tabulé (collable dans Excel) pour le presse-papiers. */
export function excelToTsv(excel: Excel, rows = computeRows(excel)) {
  const header = excel.columns.map((column) => column.label).join("\t");
  const body = rows.map((row) =>
    excel.columns.map((column) => String(row[column.key] ?? "")).join("\t"),
  );
  return [header, ...body].join("\n");
}
