import { z } from "zod";

/** Fichier texte de contexte, indépendant du dataset, injecté en début de conversation. */
export const contextFileSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  /** Coché par défaut pour les nouvelles conversations. */
  selectedByDefault: z.boolean().default(false),
});

export type ContextFile = z.infer<typeof contextFileSchema>;
