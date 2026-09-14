import { createArtefact } from "@/lib/create-artefact";
import { visualSpecSchema } from "@/schemas/visual-spec-schema";
import { z } from "zod";

export const dashboardSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  visuals: z.array(visualSpecSchema),
});

export type Dashboard = z.infer<typeof dashboardSchema>;

export const dashboardArtefact = createArtefact({
  name: "dashboard",
  description:
    "Tableau de bord : une liste de visuels (graphiques, tables, textes) alimentés chacun par une requête DAX exécutée côté client.",
  prompt: [
    "- Chaque visuel a un `id` unique (kebab-case), un `title`, une `daxQuery` et un `kind` : `chart` (défaut), `table` ou `text`.",
    "- Réutilise la daxQuery déjà exécutée avec runDax : les alias camelCase = `dataKey`.",
    "- `chart` + `chartSpec` (version 1) : `xAxis.dataKey` = dimension, `series[].dataKey` = mesures. Les couleurs sont imposées par la charte, il n'y a pas de champ couleur.",
    "  Choix du type : `bar` = comparer des catégories (magasins, produits) ; `line` = évolution dans le temps (mois, années) ; `area` = évolution cumulée ou volume dans le temps ; `pie` = répartition/parts ≤ 8 tranches (1 seule série) ; `composed` = 2 mesures d'échelles différentes (bar CA + line marge %, `yAxisId` distinct).",
    "  Un dashboard de plusieurs visuels doit mélanger les types : jamais uniquement des `bar`. Pour comparer 2 entités sur N métriques, préfère UNE table ou un `bar` multi-séries plutôt que N histogrammes identiques.",
    "- `table` + `columns[]` (`dataKey`, `label`, `format` : text, number, integer, currency, percent, date) + `pageSize` : pour un détail ligne à ligne, un top N > 8, ou plusieurs métriques côte à côte.",
    '- `text` + `template` : phrase de synthèse avec placeholders `{{alias}}` ou `{{alias|currency}}` remplis par la première ligne du DAX (ex. `EVALUATE ROW("ca", [TotalSales])`). Idéal en tête de dashboard pour les KPI clés.',
    "- Dashboard simple = 1 visuel. « Rapport » ou dashboard complet = 3 à 6 visuels variés (ex. un `text` KPI, un `bar` ou `pie`, un `line`, une `table`). Titre explicite sur chaque visuel.",
  ].join("\n"),
  schema: dashboardSchema,
});
