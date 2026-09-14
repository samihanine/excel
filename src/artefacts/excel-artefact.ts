import { createArtefact } from "@/lib/create-artefact";
import { z } from "zod";

export const excelCellSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export type ExcelCell = z.infer<typeof excelCellSchema>;

export const excelColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    "text",
    "number",
    "currency",
    "percent",
    "date",
    "boolean",
    "select",
  ]),
  /** Valeurs autorisées pour `select`. */
  options: z.array(z.string()).optional(),
  /** Expression mathjs entre colonnes de la même ligne (ex. `prix * quantite`). */
  formula: z.string().optional(),
});

export type ExcelColumn = z.infer<typeof excelColumnSchema>;

/** Couleurs de fond autorisées (palette de la charte, pas d'hex libre). */
export const EXCEL_BACKGROUNDS = [
  "gold",
  "muted",
  "success",
  "warning",
  "danger",
] as const;

export const excelStyleRuleSchema = z.object({
  column: z.string().min(1),
  operator: z.enum([
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "contains",
    "empty",
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  background: z.enum(EXCEL_BACKGROUNDS),
});

export type ExcelStyleRule = z.infer<typeof excelStyleRuleSchema>;

export const excelSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  columns: z.array(excelColumnSchema).min(1),
  rows: z.array(z.record(z.string(), excelCellSchema)),
  styles: z.array(excelStyleRuleSchema).default([]),
});

export type Excel = z.infer<typeof excelSchema>;

export const excelArtefact = createArtefact({
  name: "excel",
  description:
    "Feuille de calcul : colonnes typées + lignes stockées dans l'artefact (données statiques, pas de DAX à l'affichage). L'utilisateur peut la télécharger en .xlsx.",
  prompt: [
    "- Les données vivent dans `rows` : c'est toi qui ajoutes/modifies les lignes (issues de runDax, de l'utilisateur ou d'un calcul). Rien n'est recalculé depuis le modèle.",
    "- `columns[].key` = clé dans chaque ligne (camelCase). `type` : text, number, currency, percent (0.12 = 12 %), date (ISO), boolean, select (avec `options`).",
    "- `formula` : expression mathjs sur les clés de la ligne (`prixUnitaire * quantite`, `ca2014 / ca2013 - 1`). La valeur est calculée à l'affichage, ne la mets pas dans `rows`.",
    "- `styles` : colore le fond d'une cellule si la règle est vraie (`{column:'marge', operator:'lt', value:0, background:'danger'}`). Fonds possibles : gold, muted, success, warning, danger.",
    "- Retouche ciblée : `path` = `rows.3.statut` ou `rows.12` (nouvelle ligne à l'index suivant), sinon renvoie tout.",
  ].join("\n"),
  schema: excelSchema,
});
