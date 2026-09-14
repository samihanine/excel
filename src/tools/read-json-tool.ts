import { createTool } from "@/lib/create-tool";
import { z } from "zod";

export const readJsonTool = createTool({
  name: "readJson",
  description: "Read a JSON object",
  parameters: z.object({
    storageKey: z.string(),
  }),
  response: z.object({
    value: z.string(),
  }),
  prompt: ["You can read a JSON object"].join("\n"),
  function: async (props) => {
    return {
      value: props.storageKey,
    };
  },
});
