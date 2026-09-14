import { createTool } from "@/lib/create-tool";
import { z } from "zod";

export const answerUserTool = createTool({
  name: "answerUser",
  description: "Answer the user's question",
  parameters: z.object({
    question: z.string(),
  }),
  response: z.object({
    answer: z.string(),
  }),
  prompt: ["You can answer the user's question"].join("\n"),
  function: async (props) => {
    return {
      answer: props.question,
    };
  },
});
