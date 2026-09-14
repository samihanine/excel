import { z } from "zod";

const seriesSchema = z.object({
  dataKey: z.string().min(1),
  name: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
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

export const visualSpecSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  chartSpec: chartSpecSchema,
  daxQuery: z.string(),
});

export type VisualSpec = z.infer<typeof visualSpecSchema>;

export const dashboardSchema = z.object({
  version: z.literal(1),
  title: z.string().optional(),
  description: z.string().optional(),
  visuals: z.array(visualSpecSchema),
});

export type Dashboard = z.infer<typeof dashboardSchema>;
