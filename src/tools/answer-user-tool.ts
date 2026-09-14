import { createTool } from "@/lib/create-tool";
import { z } from "zod";

export const answerUserTool = createTool({
  name: "answerUser",
  description: "Envoie la réponse finale à l'utilisateur et termine le tour.",
  parameters: z.object({
    answer: z.string().min(1),
  }),
  response: z.object({
    answer: z.string(),
  }),
  prompt: [
    "Réponse courte et concrète, en français, en texte brut (pas de markdown : ni `**`, ni `#`, ni backticks ; les tirets de liste sont acceptés).",
    "Si tu as créé ou modifié un artefact, dis-le en une phrase : il est déjà affiché à l'utilisateur, ne le recopie pas.",
    "Si tu es bloqué ou s'il manque une info (période, magasin, définition d'un indicateur) : pose une question courte, n'invente pas.",
  ].join("\n"),
  function: async ({ answer }) => ({ answer }),
});
