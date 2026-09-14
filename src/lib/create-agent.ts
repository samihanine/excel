import type { Model } from "./llm";
import type { Tool } from "./create-tool";
import { createConversation, createMessage } from "./llm";

export const createAgent = async (props: {
  model: Model;
  name: string;
  description: string;
  prompt: string;
  tools: Tool[];
}) => {
  const setup = async ({ title }: { title: string }) => {
    const result = await createConversation({
      title,
    });

    // TODO: Add the system prompt to the conversation

    return result;
  };

  const sendMessage = async ({
    conversationId,
    textContent,
  }: {
    conversationId: string;
    textContent: string;
  }): Promise<string> => {
    // TODO: Loop through the tools and call them if needed

    const message = await createMessage({
      conversationId,
      textContent,
      model: props.model,
    });

    return message.textContent;
  };

  return {
    sendMessage,
    setup,
  };
};
