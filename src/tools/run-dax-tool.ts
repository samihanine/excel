import { createTool } from "@/lib/create-tool";
import { daxResultSchema, runDax } from "@/lib/dax";
import { CURRENT_SEMANTIC_MODEL_STORAGE_KEY, readJson } from "@/lib/storage";
import { z } from "zod";

export const runDaxTool = createTool({
  name: "runDax",
  description: "Run a DAX query",
  prompt: [
    "DAX :",
    "- Toujours `'Table'[Colonne]`. Time, Date, Item et les mots réservés : quotes obligatoires (`'Item'[Category]`, pas `Item[Category]`).",
    `- Pour grouper : \`SUMMARIZECOLUMNS('Table'[Colonne], "aliasMesure", [Mesure])\` puis \`SELECTCOLUMNS(..., "aliasDim", 'Table'[Colonne], "aliasMesure", [aliasMesure])\`. Termine par \`ORDERBY\` si tu ranges (TOPN ne garantit pas l'ordre d'affichage)`,
    "- Une seule année, sans comparaison : `CALCULATETABLE(SUMMARIZECOLUMNS(...), 'Time'[FiscalYear] = 2014)` est correct.",
    "- Comparer 2014 et 2013 : **aucun** filtre année autour de SUMMARIZECOLUMNS. Chaque mesure : `CALCULATE([TotalSales], ALL('Time'[FiscalYear]), 'Time'[FiscalYear] = 2014)`. Sinon 2013 est vide et `2014 - BLANK() = 2014` (écart faux).",
    "- Jamais `KEEPFILTERS('Time'[FiscalYear] = …)` dans `SUMMARIZECOLUMNS` ou `SELECTCOLUMNS`.",
    `- Ne jamais ajouter une colonne de groupe comme expression nommée (\`"ville", 'Store'[City]\` dans \`SUMMARIZECOLUMNS\`)`,
    "- Mesures TY / LY / Variance = période « courante » du modèle. Pour une année historique, CALCULATE + ALL('Time'[FiscalYear]), pas [TotalSalesLY].",
    "- Si N-1 est vide : ne calcule pas d'écart (laisse BLANK), ne dis pas que l'évolution est égale aux ventes N.",
    "- `FORMAT()` est interdit pour les nombres. Utilise `visualOptions` / `format`,",
    "- Après un résultat : si les colonnes DAX ≠ `roles.*.field`, corrige la spec.",
    "- Un seul critère de ranking : TOPN une fois, puis `dataId`,",
    "- Plusieurs visuels sur le même grain : `dataId` = id du tableau, **sans** `daxQuery`.",
    "- Résultat tout blanc (ROW de ∅, 0 ligne) : le filtre n'a probablement rien. `VALUES('Table'[Colonne])` pour voir les valeurs présentes, puis corrige ou `reply`. Ne construis pas le rapport sur du vide.",
  ].join("\n"),
  parameters: z.object({
    dax: z.string(),
  }),
  response: daxResultSchema,
  function: async (query) => {
    const datasetName = readJson<string>(
      CURRENT_SEMANTIC_MODEL_STORAGE_KEY,
      "",
    );

    if (datasetName === "") {
      throw new Error("No dataset selected");
    }

    return await runDax(datasetName, query.dax);
  },
});
