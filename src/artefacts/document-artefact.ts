import { createArtefact } from "@/lib/create-artefact";
import { z } from "zod";

export const documentSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1),
});

export type Document = z.infer<typeof documentSchema>;

export const documentArtefact = createArtefact({
  name: "document",
  description:
    "Texte libre affiché à l'utilisateur avec un bouton copier (correction, traduction, rédaction, synthèse).",
  prompt: [
    "- À utiliser dès que l'utilisateur demande de corriger, reformuler, traduire, résumer ou rédiger un texte : le résultat va dans `content`, pas dans answerUser.",
    "- `content` en texte brut, structure du texte d'origine conservée (paragraphes, listes). Pas de commentaire dedans : les explications éventuelles vont dans answerUser.",
    "- Traduction : ne traduis que le texte fourni, sans ajouter d'introduction.",
    "- Une retouche se fait avec `path` (`content`).",
  ].join("\n"),
  schema: documentSchema,
  empty: { content: "Document à rédiger." },
});
