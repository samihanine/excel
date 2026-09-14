import { all, create } from "mathjs";

const math = create(all);
// À capturer avant de bloquer `evaluate` dans l'instance (recommandation mathjs).
const limitedEvaluate = math.evaluate;

// Désactiver les fonctions qui permettent d'échapper au bac à sable.
const blocked = () => {
  throw new Error("Fonction non autorisée.");
};
math.import(
  {
    import: blocked,
    createUnit: blocked,
    evaluate: blocked,
    parse: blocked,
    simplify: blocked,
    derivative: blocked,
  },
  { override: true },
);

export type MathScope = Record<string, unknown>;

/** Évalue une expression mathjs avec des variables. Renvoie un nombre, une chaîne ou un booléen. */
export function evaluateExpression(expression: string, scope: MathScope = {}) {
  const result: unknown = limitedEvaluate(expression, { ...scope });
  if (typeof result === "number" || typeof result === "boolean") return result;
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "toString" in result) {
    return String(result);
  }
  return String(result);
}

/** Évalue une formule sur une ligne : renvoie `null` si une variable manque ou si l'expression échoue. */
export function evaluateFormula(
  formula: string,
  row: Record<string, unknown>,
): number | string | boolean | null {
  try {
    const scope: MathScope = {};
    for (const [key, value] of Object.entries(row)) {
      if (value !== null && value !== undefined && value !== "")
        scope[key] = value;
    }
    const result = evaluateExpression(formula, scope);
    if (typeof result === "number" && !Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}
