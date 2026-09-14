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
    "Tableau de bord : visuels (graphiques, tables, textes KPI) alimentés chacun par une requête DAX exécutée côté client. À utiliser pour tout rapport, analyse, comparaison ou graphique demandé par l'utilisateur.",
  prompt: [
    "Quand l'utiliser :",
    "- « rapport », « analyse », « dashboard », « compare » sans précision = dashboard complet : 3 à 6 visuels de types différents (un `text` KPI, un `bar` ou `pie`, un `line` si une dimension temporelle a du sens, une `table` pour le détail). Un seul visuel n'est pas un rapport.",
    "- « graphique de X par Y » = 1 visuel du type adapté.",
    "- Un seul chiffre sans dimension (« c'est combien ») = pas de dashboard, réponds en texte.",
    "",
    "Construction :",
    "- Exécute d'abord chaque requête avec runDax (une par visuel, réutilisée telle quelle dans `daxQuery`) ; ne construis jamais un visuel sur un résultat vide ou en erreur.",
    "- Chaque visuel : `id` unique (kebab-case), `title` explicite, `daxQuery`, `kind` = `chart` (défaut), `table` ou `text`. Les alias camelCase du DAX = `dataKey`.",
    "- `chart` + `chartSpec` (version 1) : `xAxis.dataKey` = dimension, `series[].dataKey` = mesures. Couleurs imposées par la charte : aucun champ couleur.",
    "  `bar` = comparer des catégories ; `line` = évolution dans le temps ; `area` = volume cumulé dans le temps ; `pie` = répartition ≤ 8 tranches (1 série) ; `composed` = 2 mesures d'échelles différentes (`yAxisId` distinct).",
    "  Un dashboard mélange les types : jamais uniquement des `bar`. Comparer 2 entités sur N métriques = UNE `table` ou un `bar` multi-séries, pas N histogrammes.",
    "- `table` + `columns[]` (`dataKey`, `label`, `format` : text, number, integer, currency, percent, date) + `pageSize` : détail ligne à ligne, top N > 8, plusieurs métriques côte à côte.",
    '- `text` + `template` : phrase avec placeholders `{{alias}}` ou `{{alias|currency}}` remplis par la première ligne du DAX (ex. `EVALUATE ROW("ca", [TotalSales])`). Idéal en tête pour les KPI.',
    "- Retouche : `path` = `visuals.<index>` ou `visuals.<index>.title` ; ajout = `visuals.<nouvel index>`.",
  ].join("\n"),
  schema: dashboardSchema,
});
