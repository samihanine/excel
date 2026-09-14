import { z } from "zod";
import type { Model } from "./llm";
import type { Tool } from "./create-tool";
import { addMessage, createConversation, createMessage } from "./llm";
import { answerUserTool } from "@/tools/answer-user-tool";
import { MAX_TOOL_CALLS } from "./constants";
import { getErrorMessage } from "./retry";
import type { Artefact } from "./create-artefact";

const agentCallSchema = z.object({
  tool: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()).default({}),
});

type AgentCall = z.infer<typeof agentCallSchema>;

function uniqueTools(tools: Tool[]) {
  const byName = new Map<string, Tool>();

  for (const tool of tools) {
    byName.set(tool.name, tool);
  }

  return [...byName.values()];
}

function toolParametersSchema(tool: Tool) {
  try {
    return z.toJSONSchema(tool.parameters);
  } catch {
    return { type: "object" };
  }
}

function buildSystemPrompt({
  name,
  description,
  prompt,
  tools,
}: {
  name: string;
  description: string;
  prompt: string;
  tools: Tool[];
}) {
  const toolsDescription = tools
    .map((tool) =>
      [
        `### ${tool.name}`,
        tool.description,
        tool.prompt,
        "Schéma des paramètres :",
        JSON.stringify(toolParametersSchema(tool), null, 2),
      ].join("\n"),
    )
    .join("\n\n");

  return [
    `Tu es ${name}.`,
    description,
    "",
    prompt,
    "",
    "Tu dois TOUJOURS répondre uniquement avec un objet JSON valide, sans markdown, au format :",
    '{"tool":"<nom_outil>","parameters":{...}}',
    "N'appelle qu'un seul outil à la fois.",
    `Quand tu as la réponse finale pour l'utilisateur, tu DOIS appeler l'outil "${answerUserTool.name}".`,
    "",
    "Outils disponibles :",
    toolsDescription,
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
  return [`Sortie de l'outil ${toolName} :`, JSON.stringify(payload)].join(
    "\n",
  );
}

async function executeTool(tool: Tool, parameters: unknown) {
  const parsedParameters = tool.parameters.parse(parameters);
  const result = await tool.function(parsedParameters);
  return tool.response.parse(result);
}

export const createAgent = async (props: {
  model: Model;
  name: string;
  description: string;
  prompt: string;
  tools: Tool[];
  artefacts: Artefact[];
}) => {
  const tools = uniqueTools([...props.tools, answerUserTool]);
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const systemPrompt = buildSystemPrompt({
    name: props.name,
    description: props.description,
    prompt: props.prompt,
    tools,
  });

  const setup = async ({ title }: { title: string }) => {
    const conversation = await createConversation({
      title,
    });

    await addMessage({
      conversationId: conversation.id,
      textContent: systemPrompt,
      role: "system",
    });

    return conversation;
  };

  const continueWithAgentMessage = async ({
    conversationId,
    agentText,
    remainingCalls,
  }: {
    conversationId: string;
    agentText: string;
    remainingCalls: number;
  }): Promise<string> => {
    const retryWithSystemMessage = async (textContent: string) => {
      if (remainingCalls <= 0) {
        throw new Error(
          "Nombre maximal d'appels d'outils atteint avant une réponse finale.",
        );
      }

      const nextMessage = await createMessage({
        conversationId,
        textContent,
        model: props.model,
        role: "system",
      });

      return continueWithAgentMessage({
        conversationId,
        agentText: nextMessage.textContent,
        remainingCalls: remainingCalls - 1,
      });
    };

    let call: AgentCall;

    try {
      call = parseAgentCall(agentText);
    } catch (error) {
      return retryWithSystemMessage(
        `Réponse JSON invalide : ${getErrorMessage(error)}. Réponds uniquement avec {"tool":"<nom_outil>","parameters":{...}}.`,
      );
    }

    const tool = toolsByName.get(call.tool);

    if (!tool) {
      return retryWithSystemMessage(
        `Outil inconnu : "${call.tool}". Outils disponibles : ${tools.map((available) => available.name).join(", ")}.`,
      );
    }

    if (tool.name === answerUserTool.name) {
      try {
        const result = await executeTool(tool, call.parameters);
        return answerUserTool.response.parse(result).answer;
      } catch (error) {
        return retryWithSystemMessage(
          formatToolOutput(tool.name, { error: getErrorMessage(error) }),
        );
      }
    }

    if (remainingCalls <= 0) {
      throw new Error(
        "Nombre maximal d'appels d'outils atteint avant une réponse finale.",
      );
    }

    let output: unknown;

    try {
      output = await executeTool(tool, call.parameters);
    } catch (error) {
      output = { error: getErrorMessage(error) };
    }

    const nextMessage = await createMessage({
      conversationId,
      textContent: formatToolOutput(tool.name, output),
      model: props.model,
      role: "system",
    });

    return continueWithAgentMessage({
      conversationId,
      agentText: nextMessage.textContent,
      remainingCalls: remainingCalls - 1,
    });
  };

  const sendMessage = async ({
    conversationId,
    textContent,
  }: {
    conversationId: string;
    textContent: string;
  }): Promise<string> => {
    const agentMessage = await createMessage({
      conversationId,
      textContent,
      model: props.model,
    });

    return continueWithAgentMessage({
      conversationId,
      agentText: agentMessage.textContent,
      remainingCalls: MAX_TOOL_CALLS,
    });
  };

  return {
    sendMessage,
    setup,
  };
};
