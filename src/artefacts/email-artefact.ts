import { createArtefact } from "@/lib/create-artefact";
import { z } from "zod";

export const emailSchema = z.object({
  to: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export type Email = z.infer<typeof emailSchema>;

export const emailArtefact = createArtefact({
  name: "email",
  description:
    "E-mail prêt à envoyer : objet et corps, chacun copiable par l'utilisateur.",
  prompt: [
    "- À utiliser quand l'utilisateur demande de rédiger, reformuler ou préparer un mail / message à envoyer.",
    "- `subject` court et précis ; `body` en texte brut (pas de markdown), avec salutation, paragraphes séparés par une ligne vide et signature si le contexte la donne.",
    "- Les chiffres cités dans le mail viennent de runDax ou de `calculate`, jamais inventés.",
    "- Une retouche se fait avec `path` (`subject` ou `body`).",
  ].join("\n"),
  schema: emailSchema,
  empty: { subject: "Objet à définir", body: "Corps du mail à rédiger." },
});
