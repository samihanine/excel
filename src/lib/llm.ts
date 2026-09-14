import OpenAI from "openai";

const LLM_API_KEY = import.meta.env.VITE_PUBLIC_AI_API_KEY;

export type Model = "gpt-5.6-luna" | "gpt-5.6-terra";

const OPENAI_MODELS: Record<Model, string> = {
  "gpt-5.6-luna": "gpt-5.6-luna",
  "gpt-5.6-terra": "gpt-5.6-terra",
};

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
};

type Message = {
  id: string;
  conversationId: string;
  textContent: string;
  createdAt: string;
};

type MessageRole = "system" | "user" | "assistant";

type StoredMessage = Message & {
  role: MessageRole;
};

const conversations = new Map<string, Conversation>();
const messagesByConversation = new Map<string, StoredMessage[]>();

const openai = new OpenAI({
  apiKey: LLM_API_KEY,
  dangerouslyAllowBrowser: true,
});

function toPublicMessage(message: StoredMessage): Message {
  return {
    id: message.id,
    conversationId: message.conversationId,
    textContent: message.textContent,
    createdAt: message.createdAt,
  };
}

function requireConversationMessages(conversationId: string) {
  const messages = messagesByConversation.get(conversationId);

  if (!messages || !conversations.has(conversationId)) {
    throw new Error(`Conversation ${conversationId} introuvable`);
  }

  return messages;
}

function appendMessage({
  conversationId,
  textContent,
  role,
}: {
  conversationId: string;
  textContent: string;
  role: MessageRole;
}): StoredMessage {
  const conversationMessages = requireConversationMessages(conversationId);

  const message: StoredMessage = {
    id: crypto.randomUUID(),
    conversationId,
    textContent,
    createdAt: new Date().toISOString(),
    role,
  };

  conversationMessages.push(message);

  return message;
}

export const addMessage = async ({
  conversationId,
  textContent,
  role,
}: {
  conversationId: string;
  textContent: string;
  role: MessageRole;
}): Promise<Message> => {
  return toPublicMessage(appendMessage({ conversationId, textContent, role }));
};

export const getConversations = async (): Promise<Conversation[]> => {
  return [...conversations.values()];
};

export const createConversation = async ({
  title,
}: {
  title: string;
}): Promise<Conversation> => {
  const conversation: Conversation = {
    id: crypto.randomUUID(),
    title,
    createdAt: new Date().toISOString(),
  };

  conversations.set(conversation.id, conversation);
  messagesByConversation.set(conversation.id, []);

  return conversation;
};

export const getMessages = async ({
  conversationId,
}: {
  conversationId: string;
}): Promise<Message[]> => {
  return requireConversationMessages(conversationId).map(toPublicMessage);
};

export const createMessage = async ({
  conversationId,
  textContent,
  model,
  role = "user",
}: {
  conversationId: string;
  textContent: string;
  model: Model;
  role?: Exclude<MessageRole, "assistant">;
}): Promise<Message> => {
  const conversationMessages = requireConversationMessages(conversationId);

  appendMessage({ conversationId, textContent, role });

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODELS[model],
    response_format: { type: "json_object" },
    messages: conversationMessages.map((message) => ({
      role: message.role,
      content: message.textContent,
    })),
  });

  const assistantMessage = appendMessage({
    conversationId,
    textContent: completion.choices[0]?.message.content ?? "",
    role: "assistant",
  });

  return toPublicMessage(assistantMessage);
};
