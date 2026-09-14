import type { ValueFormat } from "@/schemas/visual-spec-schema";

type Scalar = string | number | boolean | null | undefined;

const FORMATS: Record<ValueFormat, (value: number) => string> = {
  text: (value) => String(value),
  number: (value) =>
    value.toLocaleString("fr-FR", { maximumFractionDigits: 2 }),
  integer: (value) =>
    value.toLocaleString("fr-FR", { maximumFractionDigits: 0 }),
  currency: (value) =>
    value.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }),
  percent: (value) =>
    value.toLocaleString("fr-FR", {
      style: "percent",
      maximumFractionDigits: 1,
    }),
  date: (value) => new Date(value).toLocaleDateString("fr-FR"),
};

/** Formate une valeur scalaire pour l'affichage (fr-FR). */
export function formatValue(value: Scalar, format: ValueFormat = "text") {
  if (value === null || value === undefined || value === "") return "—";
  if (format === "date") {
    const date = new Date(value as string | number);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString("fr-FR");
  }
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  const numeric = typeof value === "number" ? value : Number(value);
  if (format !== "text" && Number.isFinite(numeric)) {
    return FORMATS[format](numeric);
  }
  return String(value);
}

const isFormat = (candidate: string): candidate is ValueFormat =>
  candidate in FORMATS;

/** Remplace `{{alias}}` / `{{alias|currency}}` par les valeurs de `row`. */
export function renderTemplate(template: string, row: Record<string, Scalar>) {
  return template.replace(
    /\{\{\s*([\w.-]+)\s*(?:\|\s*(\w+)\s*)?\}\}/g,
    (_match, key: string, format?: string) => {
      if (!(key in row)) return `{{${key}}}`;
      return formatValue(
        row[key],
        format && isFormat(format) ? format : "text",
      );
    },
  );
}
