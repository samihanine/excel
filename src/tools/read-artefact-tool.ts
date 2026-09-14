import { createTool } from "@/lib/create-tool";
import { store } from "@/lib/storage";
import { z } from "zod";

export const readArtefactTool = createTool({
  name: "readArtefact",
  description: "Lit le contenu complet d'un artefact de la conversation.",
  parameters: z.object({
    id: z.string().min(1),
  }),
  response: z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    data: z.unknown(),
  }),
  prompt:
    "Utilise-le avant de retoucher un artefact avec `path`, pour connaître sa structure actuelle.",
  function: async ({ id }, { conversationId }) => {
    const artefact = store.conversations
      .get(conversationId)
      ?.artefacts.find((candidate) => candidate.id === id);
    if (!artefact) throw new Error(`Artefact « ${id} » introuvable.`);
    return artefact;
  },
});
