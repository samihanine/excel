import { createArtefact } from "@/lib/create-artefact";
import { placeSections } from "@/lib/pptx/layout";
import { PPTX_BACKGROUND_KEYS } from "@/lib/pptx/theme";
import { valueFormatSchema } from "@/schemas/visual-spec-schema";
import { z } from "zod";

const spanSchema = z.object({
  cols: z.number().int().min(1).max(12),
  rows: z.number().int().min(1).max(12),
});

const sectionBase = {
  id: z.string().min(1),
  span: spanSchema,
  col: z.number().int().min(0).max(11).optional(),
  row: z.number().int().min(0).max(11).optional(),
};

const cellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const comparisonSideSchema = z.object({
  title: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
});

const tableColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  format: valueFormatSchema.default("text"),
});

export const pptxSectionSchema = z.discriminatedUnion("type", [
  z.object({
    ...sectionBase,
    type: z.literal("hero"),
    title: z.string().min(1),
    subtitle: z.string().optional(),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("image"),
    title: z.string().min(1).optional(),
    imageUrl: z.string().min(1),
    legend: z.string().optional(),
    fit: z.enum(["contain", "cover", "fill"]).default("contain"),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("kpi"),
    label: z.string().min(1),
    value: z.union([z.string(), z.number()]),
    format: valueFormatSchema.optional(),
    variation: z.union([z.string(), z.number()]).optional(),
    comment: z.string().optional(),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("quote"),
    text: z.string().min(1),
    author: z.string().optional(),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("comparison"),
    title: z.string().optional(),
    left: comparisonSideSchema,
    right: comparisonSideSchema,
  }),
  z.object({
    ...sectionBase,
    type: z.literal("table"),
    title: z.string().optional(),
    columns: z.array(tableColumnSchema).min(1),
    rows: z.array(z.record(z.string(), cellSchema)),
  }),
  z.object({
    ...sectionBase,
    type: z.literal("chart"),
    title: z.string().optional(),
    chart: z.enum(["bar", "line", "pie"]),
    categoryKey: z.string().min(1),
    series: z
      .array(z.object({ key: z.string().min(1), name: z.string().optional() }))
      .min(1),
    rows: z.array(z.record(z.string(), cellSchema)).min(1),
  }),
]);

export const pptxSlideSchema = z.object({
  id: z.string().min(1),
  background: z.enum(PPTX_BACKGROUND_KEYS).default("ivory"),
  sections: z.array(pptxSectionSchema),
});

export const powerpointSchema = z
  .object({
    version: z.literal(1),
    title: z.string().optional(),
    slides: z.array(pptxSlideSchema),
  })
  .superRefine((doc, ctx) => {
    const slideIds = new Set<string>();
    for (const [slideIndex, slide] of doc.slides.entries()) {
      if (slideIds.has(slide.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Identifiant de slide dupliqué « ${slide.id} ».`,
          path: ["slides", slideIndex, "id"],
        });
      }
      slideIds.add(slide.id);

      const sectionIds = new Set<string>();
      for (const [sectionIndex, section] of slide.sections.entries()) {
        if (sectionIds.has(section.id)) {
          ctx.addIssue({
            code: "custom",
            message: `Identifiant de section dupliqué « ${section.id} ».`,
            path: ["slides", slideIndex, "sections", sectionIndex, "id"],
          });
        }
        sectionIds.add(section.id);
      }

      try {
        placeSections(slide.sections);
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message: error instanceof Error ? error.message : String(error),
          path: ["slides", slideIndex, "sections"],
        });
      }
    }
  });

export type Powerpoint = z.infer<typeof powerpointSchema>;
export type PptxSlide = z.infer<typeof pptxSlideSchema>;
export type PptxSection = z.infer<typeof pptxSectionSchema>;

export const powerpointArtefact = createArtefact({
  name: "powerpoint",
  description:
    "Présentation PowerPoint : slides en grille 12×12, sections typées (hero, kpi, graphique, tableau…). Aperçu live et téléchargement .pptx.",
  prompt: [
    "Quand l'utiliser : « powerpoint », « slides », « présentation », « pitch », « support de réunion ». Pas un dashboard (données DAX dynamiques) : ici les chiffres sont figés dans le JSON.",
    "",
    "Construction :",
    "- `version` : toujours 1. `slides[]` : une idée par slide, 3 à 6 slides pour un vrai support. `id` kebab-case unique.",
    "- `background` (par slide) : ivory (défaut), cream, gold, ink. Jamais de couleur hex : la charte est dans le thème.",
    "- Grille 12×12. Chaque section a `span.cols` / `span.rows` (`cols: 4` = un tiers, `rows: 6` = moitié). Placement automatique (premier espace libre) sauf si `col` et `row` sont fournis ensemble (0-indexés).",
    "- Une slide ne doit pas déborder ni chevaucher : si une section ne rentre pas, réduis le span ou crée une nouvelle slide.",
    "- Chiffres : d'abord runDax (ou calculate), puis copie les valeurs dans les sections. N'invente rien.",
    "",
    "Types de section :",
    "- `hero` : titre + sous-titre. En-tête de slide, typiquement `span` 12×3 ou 12×4.",
    "- `kpi` : `label`, `value` (nombre + `format`, ou texte déjà formaté), `variation` (nombre = écart relatif, 0.12 → +12 %), `comment`.",
    "- `chart` : `bar` (catégories), `line` (temps), `pie` (répartition ≤ 8). `categoryKey` + `series[].key` = clés dans `rows`. Couleurs imposées.",
    "- `table` : détail, top N, plusieurs métriques. `columns[].format` : text, number, integer, currency, percent, date.",
    "- `comparison` : deux colonnes (`left` / `right`) chacune avec `title` + `items[]`.",
    "- `quote` : citation + `author`.",
    "- `image` : `imageUrl` (URL http(s) ou data), `title` et `legend` optionnels. `fit` = contain (image entière), cover (cadre rempli avec recadrage) ou fill (étirement). La largeur et la hauteur sont définies par `span.cols` et `span.rows` ; utilise `col` / `row` pour une position précise.",
    "",
    "Retouche : `path` = `slides.0.sections.1` (remplace une section), `slides.0.sections.2` (ajoute), `slides.1` (nouvelle slide). Création : tout le JSON dans `value`, sans `path`.",
  ].join("\n"),
  schema: powerpointSchema,
  empty: { version: 1, slides: [] },
});
