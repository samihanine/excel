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
    "Texte libre éditable, avec gras / italique / souligné / listes (correction, traduction, rédaction, mail, synthèse).",
  prompt: [
    "- À utiliser dès que l'utilisateur demande de corriger, reformuler, traduire, résumer, rédiger un texte ou préparer un mail : le résultat va dans `content`, pas dans answerUser.",
    "- `content` : HTML simple. `<strong>` gras, `<em>` italique, `<u>` souligné, `<ul><li>` / `<ol><li>` listes, `<br>` ou `<p>` pour les sauts de ligne. Équivalent markdown accepté : `**gras**`, `*italique*`, `__souligné__`. Pas de titres `#`, pas de couleurs, pas de tableaux. Pour un mail : objet en première ligne, puis le corps.",
    "- Mets en **gras** les chiffres et conclusions, en *italique* une nuance. Pas de commentaire dans `content` : les explications vont dans answerUser.",
    "- Traduction : ne traduis que le texte fourni, sans ajouter d'introduction.",
    "- L'utilisateur peut modifier le document dans l'onglet : une retouche de ta part se fait avec `path` (`content` ou `title`).",
  ].join("\n"),
  schema: documentSchema,
  empty: { content: "Document à rédiger." },
});
