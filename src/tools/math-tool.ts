import { createTool } from "@/lib/create-tool";
import { evaluateExpression } from "@/lib/math";
import { z } from "zod";

const scalarSchema = z.union([z.number(), z.string(), z.boolean()]);

export const mathTool = createTool({
  name: "calculate",
  description:
    "Évalue une ou plusieurs expressions mathématiques (syntaxe mathjs) avec des variables. Pour les écarts, pourcentages, moyennes, arrondis : ne calcule jamais de tête.",
  prompt: [
    "- `expressions` : liste d'expressions ; `variables` : valeurs nommées réutilisables (`{ ca2014: 1370946.11, ca2013: 1193373.71 }`).",
    "- Exemples : `ca2014 - ca2013`, `(ca2014 / ca2013 - 1) * 100`, `round(x, 2)`, `mean([12, 15, 9])`, `sum(values)`, `max(a, b)`.",
    "- Une expression peut définir une variable pour la suivante : `ecart = ca2014 - ca2013` puis `ecart / ca2013`.",
    "- Renvoie `results` dans le même ordre. Utilise ces résultats tels quels dans ta réponse.",
  ].join("\n"),
  parameters: z.object({
    expressions: z.array(z.string().min(1)).min(1).max(20),
    variables: z.record(z.string(), scalarSchema).default({}),
  }),
  response: z.object({
    results: z.array(
      z.object({
        expression: z.string(),
        result: scalarSchema.nullable(),
        error: z.string().optional(),
      }),
    ),
  }),
  function: async ({ expressions, variables }) => {
    const scope: Record<string, unknown> = { ...variables };
    const results = expressions.map((expression) => {
      try {
        const result = evaluateExpression(expression, scope);
        // Les affectations (`x = …`) enrichissent le scope pour les expressions suivantes.
        const assignment = expression.match(/^\s*([A-Za-z_]\w*)\s*=(?!=)/);
        if (assignment) scope[assignment[1]] = result;
        return { expression, result };
      } catch (error) {
        return {
          expression,
          result: null,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
    return { results };
  },
});
