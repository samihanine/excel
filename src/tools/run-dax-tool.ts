import { createTool } from "@/lib/create-tool";
import { daxResultSchema, runDax } from "@/lib/dax";
import { z } from "zod";

const MAX_ROWS_FOR_AGENT = 50;

export const runDaxTool = createTool({
  name: "runDax",
  description:
    "Exécute une requête DAX sur le modèle sémantique du dataset sélectionné et renvoie les colonnes et les premières lignes.",
  prompt: [
    "Sert à explorer le modèle (VALUES, TOPN, mesures) et à vérifier une requête avant de la placer dans un artefact.",
    "DAX :",
    "- Toujours `'Table'[Colonne]`. Time, Date, Item et les mots réservés : quotes obligatoires (`'Item'[Category]`, pas `Item[Category]`).",
    `- Pour grouper : \`SUMMARIZECOLUMNS('Table'[Colonne], "aliasMesure", [Mesure])\` puis \`SELECTCOLUMNS(..., "aliasDim", 'Table'[Colonne], "aliasMesure", [aliasMesure])\`. Termine par \`ORDERBY\` si tu ranges (TOPN ne garantit pas l'ordre d'affichage).`,
    '- Les alias doivent être en camelCase sans espace (`"totalSales"`) : ce sont les `dataKey` des visuels.',
    "- Une seule année, sans comparaison : `CALCULATETABLE(SUMMARIZECOLUMNS(...), 'Time'[FiscalYear] = 2014)` est correct.",
    "- Comparer 2014 et 2013 : **aucun** filtre année autour de SUMMARIZECOLUMNS. Chaque mesure : `CALCULATE([TotalSales], ALL('Time'[FiscalYear]), 'Time'[FiscalYear] = 2014)`. Sinon 2013 est vide et `2014 - BLANK() = 2014` (écart faux).",
    "- Jamais `KEEPFILTERS('Time'[FiscalYear] = …)` dans `SUMMARIZECOLUMNS` ou `SELECTCOLUMNS`.",
    `- Ne jamais ajouter une colonne de groupe comme expression nommée (\`"ville", 'Store'[City]\` dans \`SUMMARIZECOLUMNS\`).`,
    "- Mesures TY / LY / Variance = période « courante » du modèle. Pour une année historique, CALCULATE + ALL('Time'[FiscalYear]), pas [TotalSalesLY].",
    "- Si N-1 est vide : ne calcule pas d'écart (laisse BLANK), ne dis pas que l'évolution est égale aux ventes N.",
    "- `FORMAT()` est interdit pour les nombres.",
    "- Résultat tout blanc (0 ligne, que des BLANK) : le filtre ne matche rien. `VALUES('Table'[Colonne])` pour voir les valeurs présentes, puis corrige. Ne construis pas un artefact sur du vide.",
    `- Seules les ${MAX_ROWS_FOR_AGENT} premières lignes sont renvoyées ; \`rowCount\` donne le total.`,
  ].join("\n"),
  parameters: z.object({
    dax: z.string().min(1),
  }),
  response: daxResultSchema,
  function: async ({ dax }, { dataset }) => {
    const result = await runDax({
      datasetName: dataset.semanticModelName,
      dax,
    });
    return { ...result, rows: result.rows.slice(0, MAX_ROWS_FOR_AGENT) };
  },
});
