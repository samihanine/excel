import { createArtefact } from "@/lib/create-artefact";
import { visualSpecSchema } from "@/schemas/visual-spec-schema";
import { z } from "zod";

export const dashboardSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  visuals: z.array(visualSpecSchema).min(1),
});

export type Dashboard = z.infer<typeof dashboardSchema>;

export const dashboardArtefact = createArtefact({
  name: "dashboard",
  description:
    "Tableau de bord : une liste de visuels (graphiques) alimentés chacun par une requête DAX exécutée côté client.",
  prompt: [
    "- Chaque visuel a un `id` unique, un `title`, une `daxQuery` et un `chartSpec` (version 1).",
    "- La `daxQuery` doit avoir été validée avec `runDax` : ses alias de colonnes (camelCase) sont exactement les `dataKey` du `chartSpec` (`xAxis.dataKey` pour la dimension, `series[].dataKey` pour les mesures).",
    "- `chart` : `bar` pour comparer des catégories, `line`/`area` pour une évolution, `pie` pour une répartition (≤ 8 tranches), `composed` pour mélanger barres et lignes.",
    "- Garde 1 à 6 visuels par dashboard, chacun avec un titre explicite.",
  ].join("\n"),
  schema: dashboardSchema,
});
