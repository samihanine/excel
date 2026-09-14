import { createTool } from "@/lib/create-tool";
import { z } from "zod";

export const runDaxQueryTool = createTool({
  name: "runDaxQuery",
  description: "Run a DAX query",
  prompt: "Run the following DAX query: {{query}}",
  parameters: z.object({
    query: z.string(),
  }),
  response: z.object({
    data: z.array(
      z.object({
        key: z.string(),
        value: z.string(),
      }),
    ),
  }),
  function: async (query) => {
    console.log(query);
    return {
      data: [],
    };
  },
});
