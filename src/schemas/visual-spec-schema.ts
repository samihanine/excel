import { z } from "zod";

// Pas de `color` : la palette dorée (--chart-1 … --chart-8) est appliquée automatiquement.
const seriesSchema = z.object({
  dataKey: z.string().min(1),
  name: z.string().optional(),
  type: z.enum(["line", "bar", "area"]).default("line"),
  yAxisId: z.string().optional(),
  stackId: z.string().optional(),
  showDots: z.boolean().default(true),
});

const axisSchema = z.object({
  dataKey: z.string().optional(),
  label: z.string().optional(),
  type: z.enum(["category", "number"]).default("category"),
  hide: z.boolean().default(false),
  tickCount: z.number().int().min(2).max(20).optional(),
  domain: z
    .tuple([
      z.union([
        z.number(),
        z.literal("auto"),
        z.literal("dataMin"),
        z.literal("dataMax"),
      ]),
      z.union([
        z.number(),
        z.literal("auto"),
        z.literal("dataMin"),
        z.literal("dataMax"),
      ]),
    ])
    .optional(),
});

const chartOptionsSchema = z.object({
  showGrid: z.boolean().default(true),
  showTooltip: z.boolean().default(true),
  showLegend: z.boolean().default(true),
  animate: z.boolean().default(false),
  height: z.number().int().min(200).max(1000).default(360),
});

export const chartSpecSchema = z.object({
  version: z.literal(1),
  title: z.string().optional(),
  description: z.string().optional(),

  chart: z.enum(["line", "bar", "area", "composed", "pie"]),

  xAxis: axisSchema.optional(),
  yAxis: axisSchema.optional(),

  series: z.array(seriesSchema).min(1).max(20),

  options: chartOptionsSchema,
});

export type ChartSpec = z.infer<typeof chartSpecSchema>;

/** Format d'affichage d'une valeur (colonne de table ou placeholder de texte). */
export const valueFormatSchema = z.enum([
  "text",
  "number",
  "integer",
  "currency",
  "percent",
  "date",
]);

export type ValueFormat = z.infer<typeof valueFormatSchema>;

const visualBaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  daxQuery: z.string(),
});

/** Graphique (par défaut si `kind` est absent). */
export const chartVisualSchema = visualBaseSchema.extend({
  kind: z.literal("chart").default("chart"),
  chartSpec: chartSpecSchema,
});

/** Table paginée : colonnes = alias DAX. */
export const tableVisualSchema = visualBaseSchema.extend({
  kind: z.literal("table"),
  columns: z
    .array(
      z.object({
        dataKey: z.string().min(1),
        label: z.string().optional(),
        format: valueFormatSchema.default("text"),
      }),
    )
    .min(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

/** Texte libre avec placeholders `{{alias}}` / `{{alias|currency}}` (1re ligne du DAX) et `**gras**` / `*italique*`. */
export const textVisualSchema = visualBaseSchema.extend({
  kind: z.literal("text"),
  template: z.string().min(1),
});

const matrixFieldSchema = z.object({
  dataKey: z.string().min(1),
  label: z.string().optional(),
});

/** Matrice : DAX en format long (une ligne = une combinaison ligne × colonne), pivoté à l'affichage. */
export const matrixVisualSchema = visualBaseSchema.extend({
  kind: z.literal("matrix"),
  rows: z.array(matrixFieldSchema).min(1),
  columns: matrixFieldSchema,
  values: z
    .array(
      matrixFieldSchema.extend({
        format: valueFormatSchema.default("number"),
      }),
    )
    .min(1),
  pageSize: z.number().int().min(1).max(100).default(12),
});

export const visualSpecSchema = z.union([
  tableVisualSchema,
  textVisualSchema,
  matrixVisualSchema,
  chartVisualSchema,
]);

export type VisualSpec = z.infer<typeof visualSpecSchema>;
export type ChartVisual = z.infer<typeof chartVisualSchema>;
export type TableVisual = z.infer<typeof tableVisualSchema>;
export type TextVisual = z.infer<typeof textVisualSchema>;
export type MatrixVisual = z.infer<typeof matrixVisualSchema>;
