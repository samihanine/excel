import { createTool } from "@/lib/create-tool";
import { store } from "@/lib/storage";
import { z } from "zod";

export const listArtefactsTool = createTool({
  name: "listArtefacts",
  description:
    "Liste les artefacts existants de la conversation (id, type, nom).",
  parameters: z.object({}),
  response: z.object({
    artefacts: z.array(
      z.object({ id: z.string(), type: z.string(), name: z.string() }),
    ),
  }),
  prompt: "Vérifie ce qui existe déjà avant de créer un nouvel artefact.",
  function: async (_props, { conversationId }) => ({
    artefacts: (store.conversations.get(conversationId)?.artefacts ?? []).map(
      ({ id, type, name }) => ({ id, type, name }),
    ),
  }),
});
