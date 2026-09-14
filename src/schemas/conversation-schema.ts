import { z } from "zod";

/** Message brut échangé avec le LLM (system, user, assistant). */
export const llmMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

export type LlmMessage = z.infer<typeof llmMessageSchema>;

/** Appel d'outil effectué par l'agent pendant un tour. */
export const agentStepSchema = z.object({
  tool: z.string(),
  parameters: z.unknown(),
  output: z.unknown(),
});

export type AgentStep = z.infer<typeof agentStepSchema>;

/** Message visible dans le chat (utilisateur ↔ agent). */
export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string(),
  steps: z.array(agentStepSchema).default([]),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** Instance d'artefact créée par l'agent (le type référence un `Artefact`). */
export const artefactRecordSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  data: z.unknown(),
  updatedAt: z.string(),
});

export type ArtefactRecord = z.infer<typeof artefactRecordSchema>;

/** Dossier de conversation : agent, dataset, messages, historique LLM, artefacts. */
export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  agentName: z.string(),
  datasetId: z.string(),
  /** Fichiers de contexte injectés au démarrage (figés ensuite). */
  contextFileIds: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(chatMessageSchema),
  history: z.array(llmMessageSchema),
  artefacts: z.array(artefactRecordSchema),
});

export type Conversation = z.infer<typeof conversationSchema>;
