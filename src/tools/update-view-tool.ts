import { createTool } from "@/lib/create-tool";
import { z } from "zod";

export const updateViewTool = createTool({
  name: "updateView",
  description: "Update a view",
  parameters: z.object({
    viewKey: z.string(),
  }),
  response: z.object({
    success: z.boolean(),
  }),
  prompt: ["You can update a view"].join("\n"),
  function: async (props) => {
    console.log(props);
    return {
      success: true,
    };
  },
});
