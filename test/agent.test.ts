import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createAgent } from "@/lib/create-agent";
import { createTool } from "@/lib/create-tool";
import { addMessage, createConversation, createMessage } from "@/lib/llm";
import { MAX_TOOL_CALLS } from "@/lib/constants";

vi.mock("@/lib/llm", () => ({
  createConversation: vi.fn(),
  createMessage: vi.fn(),
  addMessage: vi.fn(),
}));

const createConversationMock = vi.mocked(createConversation);
const createMessageMock = vi.mocked(createMessage);
const addMessageMock = vi.mocked(addMessage);

function agentJson(tool: string, parameters: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    conversationId: "conversation-1",
    textContent: JSON.stringify({ tool, parameters }),
    createdAt: new Date().toISOString(),
  };
}

const echoTool = createTool({
  name: "echo",
  description: "Echo a value",
  prompt: "Use echo to repeat a value",
  parameters: z.object({
    value: z.string(),
  }),
  response: z.object({
    value: z.string(),
  }),
  function: async ({ value }) => ({ value }),
});

async function createTestAgent() {
  return createAgent({
    model: "gpt-5.6-luna",
    name: "TestAgent",
    description: "Un agent de test",
    prompt: "Tu aides l'utilisateur.",
    tools: [echoTool],
    artefacts: [],
  });
}

describe("createAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createConversationMock.mockResolvedValue({
      id: "conversation-1",
      title: "Test",
      createdAt: new Date().toISOString(),
    });
    addMessageMock.mockResolvedValue({
      id: "system-1",
      conversationId: "conversation-1",
      textContent: "system",
      createdAt: new Date().toISOString(),
    });
  });

  it("ajoute le prompt système avec les outils au setup", async () => {
    const agent = await createTestAgent();

    await agent.setup({ title: "Test" });

    expect(addMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conversation-1",
        role: "system",
      }),
    );

    const systemPrompt = addMessageMock.mock.calls[0]?.[0].textContent ?? "";
    expect(systemPrompt).toContain("Tu es TestAgent.");
    expect(systemPrompt).toContain("echo");
    expect(systemPrompt).toContain("answerUser");
    expect(systemPrompt).toContain('"tool":"<nom_outil>"');
  });

  it("retourne la réponse de answerUser sans autre outil", async () => {
    const agent = await createTestAgent();
    createMessageMock.mockResolvedValueOnce(
      agentJson("answerUser", { question: "Bonjour" }),
    );

    const answer = await agent.sendMessage({
      conversationId: "conversation-1",
      textContent: "Salut",
    });

    expect(answer).toBe("Bonjour");
    expect(createMessageMock).toHaveBeenCalledTimes(1);
    expect(createMessageMock).toHaveBeenCalledWith({
      conversationId: "conversation-1",
      textContent: "Salut",
      model: "gpt-5.6-luna",
    });
  });

  it("exécute un outil puis answerUser", async () => {
    const agent = await createTestAgent();
    createMessageMock
      .mockResolvedValueOnce(agentJson("echo", { value: "ping" }))
      .mockResolvedValueOnce(agentJson("answerUser", { question: "pong" }));

    const answer = await agent.sendMessage({
      conversationId: "conversation-1",
      textContent: "Dis ping",
    });

    expect(answer).toBe("pong");
    expect(createMessageMock).toHaveBeenCalledTimes(2);
    expect(createMessageMock).toHaveBeenNthCalledWith(2, {
      conversationId: "conversation-1",
      textContent: expect.stringContaining("Sortie de l'outil echo"),
      model: "gpt-5.6-luna",
      role: "system",
    });
    expect(createMessageMock.mock.calls[1]?.[0].textContent).toContain(
      '"value":"ping"',
    );
  });

  it("renvoie une erreur système puis continue si le JSON est invalide", async () => {
    const agent = await createTestAgent();
    createMessageMock
      .mockResolvedValueOnce({
        id: "1",
        conversationId: "conversation-1",
        textContent: "pas du json",
        createdAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce(agentJson("answerUser", { question: "corrigé" }));

    const answer = await agent.sendMessage({
      conversationId: "conversation-1",
      textContent: "Hello",
    });

    expect(answer).toBe("corrigé");
    expect(createMessageMock.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        role: "system",
        textContent: expect.stringContaining("Réponse JSON invalide"),
      }),
    );
  });

  it("arrête la boucle après MAX_TOOL_CALLS", async () => {
    const agent = await createTestAgent();
    createMessageMock.mockImplementation(async () =>
      agentJson("echo", { value: "loop" }),
    );

    await expect(
      agent.sendMessage({
        conversationId: "conversation-1",
        textContent: "Boucle",
      }),
    ).rejects.toThrow("Nombre maximal d'appels d'outils atteint");

    expect(createMessageMock).toHaveBeenCalledTimes(MAX_TOOL_CALLS + 1);
  });
});
