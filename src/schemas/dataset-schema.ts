import { z } from "zod";

export const datasetSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Texte libre écrit par l'utilisateur (règles métier, précisions). */
  context: z.string(),
  /** Structure du modèle (tables, colonnes, mesures, relations), récupérée via DAX INFO. */
  structure: z.string().default(""),
  examples: z.array(z.string()),
  semanticModelName: z.string(),
});

export type Dataset = z.infer<typeof datasetSchema>;
