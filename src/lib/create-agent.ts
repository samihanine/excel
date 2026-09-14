import { z } from "zod";
import type { Model } from "./llm";
import { complete } from "./llm";
import type { Tool, ToolContext } from "./create-tool";
import type { Artefact } from "./create-artefact";
import { MAX_TOOL_CALLS } from "./constants";
import { getErrorMessage } from "./retry";
import { store } from "./storage";
import { answerUserTool } from "@/tools/answer-user-tool";
import { listArtefactsTool } from "@/tools/list-artefact-tool";
import { readArtefactTool } from "@/tools/read-artefact-tool";
import { upsertArtefactTool } from "@/tools/upsert-artefact-tool";
import type { Dataset } from "@/schemas/dataset-schema";
import type {
  AgentStep,
  Conversation,
  LlmMessage,
} from "@/schemas/conversation-schema";

const agentCallSchema = z.object({
  tool: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()).default({}),
});

type AgentCall = z.infer<typeof agentCallSchema>;

const ARTEFACT_TOOLS: Tool[] = [
  listArtefactsTool,
  readArtefactTool,
  upsertArtefactTool,
];

function uniqueTools(tools: Tool[]) {
  return [...new Map(tools.map((tool) => [tool.name, tool])).values()];
}

function jsonSchema(schema: z.ZodType) {
  try {
    return JSON.stringify(z.toJSONSchema(schema), null, 2);
  } catch {
    return '{ "type": "object" }';
  }
}

function buildSystemPrompt(props: {
  name: string;
  description: string;
  prompt: string;
  tools: Tool[];
  artefacts: Artefact[];
}) {
  const tools = props.tools.map((tool) =>
    [
      `### ${tool.name}`,
      tool.description,
      tool.prompt,
      "Schéma des paramètres :",
      jsonSchema(tool.parameters),
    ].join("\n"),
  );

  const artefacts = props.artefacts.map((artefact) =>
    [
      `### ${artefact.name}`,
      artefact.description,
      artefact.prompt,
      "Schéma du contenu (`value` de upsertArtefact) :",
      jsonSchema(artefact.schema),
    ].join("\n"),
  );

  return [
    `Tu es ${props.name}.`,
    props.description,
    "",
    props.prompt,
    "",
    "Tu dois TOUJOURS répondre uniquement avec un objet JSON valide, sans markdown, au format :",
    '{"tool":"<nom_outil>","parameters":{...}}',
    "N'appelle qu'un seul outil à la fois. La sortie de l'outil t'est renvoyée dans le message suivant.",
    `Quand tu as la réponse finale pour l'utilisateur, tu DOIS appeler l'outil "${answerUserTool.name}".`,
    "",
    "## Outils disponibles",
    ...tools,
    ...(artefacts.length
      ? ["", "## Types d'artefacts disponibles", ...artefacts]
      : []),
  ].join("\n");
}

function datasetPrompt(dataset: Dataset) {
  return [
    `Dataset sélectionné : « ${dataset.title} » (modèle sémantique Power BI : « ${dataset.semanticModelName} »).`,
    "",
    "## Structure du modèle",
    dataset.structure || "(structure inconnue : explore avec runDax)",
    "",
    "## Contexte métier",
    dataset.context || "(aucun contexte fourni)",
  ].join("\n");
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("La réponse de l'agent n'est pas un objet JSON.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function parseAgentCall(text: string): AgentCall {
  return agentCallSchema.parse(extractJsonObject(text));
}

function formatToolOutput(toolName: string, payload: unknown) {
  return `Sortie de l'outil ${toolName} :\n${JSON.stringify(payload)}`;
}

export function titleFromMessage(text: string) {
  const line = text.trim().split("\n")[0] ?? "";
  return line.length > 60 ? `${line.slice(0, 57)}…` : line || "Conversation";
}

export type Agent = ReturnType<typeof createAgent>;

export const createAgent = (props: {
  model: Model;
  name: string;
  description: string;
  prompt: string;
  tools: Tool[];
  artefacts: Artefact[];
}) => {
  const tools = uniqueTools([
    ...props.tools,
    ...(props.artefacts.length ? ARTEFACT_TOOLS : []),
    answerUserTool,
  ]);
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const systemPrompt = buildSystemPrompt({ ...props, tools });

  /** Crée le dossier de conversation avec le prompt système et le contexte du dataset. */
  const createConversation = ({ dataset }: { dataset: Dataset }) => {
    const now = new Date().toISOString();
    return store.conversations.set({
      id: crypto.randomUUID(),
      title: "Nouvelle conversation",
      agentName: props.name,
      datasetId: dataset.id,
      createdAt: now,
      updatedAt: now,
      messages: [],
      history: [
        { role: "system", content: systemPrompt },
        { role: "system", content: datasetPrompt(dataset) },
      ],
      artefacts: [],
    });
  };

  /** Boucle outil → LLM jusqu'à `answerUser`, en persistant chaque étape. */
  const sendMessage = async ({
    conversationId,
    textContent,
    onStatus,
  }: {
    conversationId: string;
    textContent: string;
    onStatus?: (status: string) => void;
  }): Promise<Conversation> => {
    const initial = store.conversations.get(conversationId);
    if (!initial) throw new Error("Conversation introuvable.");
    const dataset = store.datasets.get(initial.datasetId);
    if (!dataset)
      throw new Error("Le dataset de la conversation a été supprimé.");

    const context: ToolContext = {
      conversationId,
      dataset,
      artefacts: props.artefacts,
    };
    const steps: AgentStep[] = [];

    const append = (message: LlmMessage) =>
      store.conversations.update(conversationId, (current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        history: [...current.history, message],
      }));

    let conversation = store.conversations.update(
      conversationId,
      (current) => ({
        ...current,
        title:
          current.messages.length === 0
            ? titleFromMessage(textContent)
            : current.title,
        messages: [
          ...current.messages,
          {
            id: crypto.randomUUID(),
            role: "user",
            content: textContent,
            createdAt: new Date().toISOString(),
            steps: [],
          },
        ],
        history: [...current.history, { role: "user", content: textContent }],
      }),
    );

    let remainingCalls = MAX_TOOL_CALLS;

    for (;;) {
      onStatus?.("Réflexion…");
      const agentText = await complete({
        model: props.model,
        messages: conversation.history,
      });
      conversation = append({ role: "assistant", content: agentText });

      const respond = (content: string) => {
        if (remainingCalls <= 0) {
          throw new Error(
            "Nombre maximal d'appels d'outils atteint avant une réponse finale.",
          );
        }
        remainingCalls -= 1;
        conversation = append({ role: "system", content });
      };

      let call: AgentCall;
      try {
        call = parseAgentCall(agentText);
      } catch (error) {
        respond(
          `Réponse JSON invalide : ${getErrorMessage(error)}. Réponds uniquement avec {"tool":"<nom_outil>","parameters":{...}}.`,
        );
        continue;
      }

      const tool = toolsByName.get(call.tool);
      if (!tool) {
        respond(
          `Outil inconnu : "${call.tool}". Outils disponibles : ${tools.map((available) => available.name).join(", ")}.`,
        );
        continue;
      }

      if (tool.name === answerUserTool.name) {
        const parsed = answerUserTool.parameters.safeParse(call.parameters);
        if (!parsed.success) {
          respond(formatToolOutput(tool.name, { error: parsed.error.message }));
          continue;
        }
        return store.conversations.update(conversationId, (current) => ({
          ...current,
          updatedAt: new Date().toISOString(),
          messages: [
            ...current.messages,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: parsed.data.answer,
              createdAt: new Date().toISOString(),
              steps,
            },
          ],
        }));
      }

      if (remainingCalls <= 0) {
        throw new Error(
          "Nombre maximal d'appels d'outils atteint avant une réponse finale.",
        );
      }

      onStatus?.(`Outil ${tool.name}…`);
      let output: unknown;
      try {
        const parameters = tool.parameters.parse(call.parameters);
        output = tool.response.parse(await tool.function(parameters, context));
      } catch (error) {
        output = { error: getErrorMessage(error) };
      }

      steps.push({ tool: tool.name, parameters: call.parameters, output });
      respond(formatToolOutput(tool.name, output));
    }
  };

  return {
    name: props.name,
    description: props.description,
    createConversation,
    sendMessage,
  };
};
