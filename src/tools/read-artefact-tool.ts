import { createTool } from "@/lib/create-tool";
import { z } from "zod";
import type { Artefact } from "@/lib/create-artefact";
import { CURRENT_CONVERSATION_STORAGE_KEY, readJson } from "@/lib/storage";

export const readArtefactTool = createTool({
  name: "readArtefact",
  description: "Read an artefact",
  parameters: z.object({
    artefactId: z.string(),
  }),
  response: z.object({
    artefactJson: z.string(),
  }),
  prompt: ["You can read an artefact"].join("\n"),
  function: async (props) => {
    const path = `${CURRENT_CONVERSATION_STORAGE_KEY}-${props.artefactId}`;
    const artefactJson = readJson<any>(path, {}) as Artefact;
    return {
      artefactJson: JSON.stringify(artefactJson),
    };
  },
});
