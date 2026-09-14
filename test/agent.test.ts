// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createAgent, titleFromMessage } from "@/lib/create-agent";
import { createTool } from "@/lib/create-tool";
import { complete } from "@/lib/llm";
import { MAX_TOOL_CALLS } from "@/lib/constants";
import { store } from "@/lib/storage";
import { setAtPath } from "@/tools/upsert-artefact-tool";
import { slugify } from "@/lib/download";
import { dashboardArtefact } from "@/artefacts/dashboard-artefact";
import type { Dataset } from "@/schemas/dataset-schema";

vi.mock("@/lib/llm", () => ({
  complete: vi.fn(),
}));

const completeMock = vi.mocked(complete);

function agentJson(tool: string, parameters: Record<string, unknown>) {
  return JSON.stringify({ tool, parameters });
}

const echoTool = createTool({
  name: "echo",
  description: "Echo a value",
  prompt: "Use echo to repeat a value",
  parameters: z.object({ value: z.string() }),
  response: z.object({ value: z.string() }),
  function: async ({ value }) => ({ value }),
});

const dataset: Dataset = {
  id: "dataset-1",
  title: "Ventes",
  context: "Table Sales, mesure [TotalSales].",
  structure: "### 'Sales'\nMesures : [TotalSales] (Number)",
  examples: [],
  semanticModelName: "Sales Model",
};

function createTestAgent(artefacts = [dashboardArtefact]) {
  return createAgent({
    model: "gpt-5.6-luna",
    name: "TestAgent",
    description: "Un agent de test",
    prompt: "Tu aides l'utilisateur.",
    tools: [echoTool],
    artefacts,
  });
}

const visual = {
  id: "v1",
  title: "Ventes par mois",
  daxQuery: 'EVALUATE ROW("x", 1)',
  chartSpec: {
    version: 1,
    chart: "bar",
    xAxis: { dataKey: "month" },
    series: [{ dataKey: "sales" }],
    options: {},
  },
};

describe("storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("lit la valeur par défaut puis la valeur écrite", () => {
    expect(store.pbixToken.read()).toBe(store.pbixToken.fallback);
    store.pbixToken.write("abc");
    expect(store.pbixToken.read()).toBe("abc");
  });

  it("gère une collection : set, list, update, remove", () => {
    store.datasets.set(dataset);
    expect(store.datasets.list()).toHaveLength(1);
    expect(store.datasets.list()).toBe(store.datasets.list());

    store.datasets.update(dataset.id, (current) => ({
      ...current,
      title: "X",
    }));
    expect(store.datasets.get(dataset.id)?.title).toBe("X");

    store.datasets.remove(dataset.id);
    expect(store.datasets.list()).toEqual([]);
  });

  it("ignore une valeur stockée invalide", () => {
    window.localStorage.setItem("agent:pbix-token", JSON.stringify(42));
    expect(store.pbixToken.read()).toBe(store.pbixToken.fallback);
  });
});

describe("createAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    store.datasets.set(dataset);
  });

  it("crée la conversation avec le prompt système et le contexte du dataset", () => {
    const conversation = createTestAgent().createConversation({ dataset });

    expect(conversation.datasetId).toBe(dataset.id);
    expect(conversation.history).toHaveLength(2);
    expect(conversation.history[0].content).toContain("Tu es TestAgent.");
    expect(conversation.history[0].content).toContain("echo");
    expect(conversation.history[0].content).toContain("answerUser");
    expect(conversation.history[0].content).toContain("upsertArtefact");
    expect(conversation.history[0].content).toContain("### dashboard");
    expect(conversation.history[1].content).toContain("Sales Model");
    expect(conversation.history[1].content).toContain(dataset.context);
    expect(conversation.history[1].content).toContain(dataset.structure);
    expect(store.conversations.get(conversation.id)).toBeDefined();
  });

  it("n'ajoute pas les outils d'artefacts sans artefact", () => {
    const conversation = createTestAgent([]).createConversation({ dataset });
    expect(conversation.history[0].content).not.toContain("upsertArtefact");
  });

  it("retourne la réponse de answerUser et persiste les messages", async () => {
    const agent = createTestAgent();
    const { id } = agent.createConversation({ dataset });
    completeMock.mockResolvedValueOnce(
      agentJson("answerUser", { answer: "Bonjour" }),
    );

    const conversation = await agent.sendMessage({
      conversationId: id,
      textContent: "Salut",
    });

    expect(conversation.title).toBe("Salut");
    expect(conversation.messages.map((message) => message.content)).toEqual([
      "Salut",
      "Bonjour",
    ]);
    expect(conversation.history.map((message) => message.role)).toEqual([
      "system",
      "system",
      "user",
      "assistant",
    ]);
    expect(completeMock).toHaveBeenCalledTimes(1);
  });

  it("exécute un outil avec le contexte puis answerUser", async () => {
    const agent = createTestAgent();
    const { id } = agent.createConversation({ dataset });
    const statuses: string[] = [];
    completeMock
      .mockResolvedValueOnce(agentJson("echo", { value: "ping" }))
      .mockResolvedValueOnce(agentJson("answerUser", { answer: "pong" }));

    const conversation = await agent.sendMessage({
      conversationId: id,
      textContent: "Dis ping",
      onStatus: (status) => statuses.push(status),
    });

    expect(conversation.messages.at(-1)?.steps).toEqual([
      {
        tool: "echo",
        parameters: { value: "ping" },
        output: { value: "ping" },
      },
    ]);
    expect(completeMock.mock.calls[1]?.[0].messages.at(-1)).toEqual({
      role: "system",
      content: expect.stringContaining('"value":"ping"'),
    });
    expect(statuses).toContain("Outil echo…");
  });

  it("renvoie une erreur système puis continue si le JSON est invalide", async () => {
    const agent = createTestAgent();
    const { id } = agent.createConversation({ dataset });
    completeMock
      .mockResolvedValueOnce("pas du json")
      .mockResolvedValueOnce(agentJson("answerUser", { answer: "corrigé" }));

    const conversation = await agent.sendMessage({
      conversationId: id,
      textContent: "Hello",
    });

    expect(conversation.messages.at(-1)?.content).toBe("corrigé");
    expect(completeMock.mock.calls[1]?.[0].messages.at(-1)?.content).toContain(
      "Réponse JSON invalide",
    );
  });

  it("crée puis retouche un artefact dashboard", async () => {
    const agent = createTestAgent();
    const { id } = agent.createConversation({ dataset });
    completeMock
      .mockResolvedValueOnce(
        agentJson("upsertArtefact", {
          type: "dashboard",
          id: "ventes",
          name: "Ventes",
          value: { visuals: [visual] },
        }),
      )
      .mockResolvedValueOnce(
        agentJson("upsertArtefact", {
          type: "dashboard",
          id: "ventes",
          path: "visuals.0.title",
          value: "Nouveau titre",
        }),
      )
      .mockResolvedValueOnce(
        agentJson("upsertArtefact", {
          type: "inconnu",
          id: "x",
          name: "X",
          value: {},
        }),
      )
      .mockResolvedValueOnce(agentJson("answerUser", { answer: "ok" }));

    const conversation = await agent.sendMessage({
      conversationId: id,
      textContent: "Dashboard",
    });

    expect(conversation.artefacts).toHaveLength(1);
    const data = dashboardArtefact.schema.parse(conversation.artefacts[0].data);
    expect(data.visuals[0].title).toBe("Nouveau titre");
    expect(data.visuals[0].chartSpec.options.showGrid).toBe(true);
    expect(conversation.messages.at(-1)?.steps[2]?.output).toEqual({
      error: expect.stringContaining("Type d'artefact inconnu"),
    });
  });

  it("arrête la boucle après MAX_TOOL_CALLS", async () => {
    const agent = createTestAgent();
    const { id } = agent.createConversation({ dataset });
    completeMock.mockImplementation(async () =>
      agentJson("echo", { value: "loop" }),
    );

    await expect(
      agent.sendMessage({ conversationId: id, textContent: "Boucle" }),
    ).rejects.toThrow("Nombre maximal d'appels d'outils atteint");

    expect(completeMock).toHaveBeenCalledTimes(MAX_TOOL_CALLS + 1);
  });
});

describe("helpers", () => {
  it("setAtPath écrit en profondeur et crée les tableaux", () => {
    expect(setAtPath({}, "visuals.0.title", "a")).toEqual({
      visuals: [{ title: "a" }],
    });
    expect(setAtPath({ a: { b: 1 } }, "a.c", 2)).toEqual({ a: { b: 1, c: 2 } });
    expect(() => setAtPath({}, "__proto__.x", 1)).toThrow();
  });

  it("slugify produit un nom de fichier sûr", () => {
    expect(slugify("Ventes 2014 — par catégorie !")).toBe(
      "ventes-2014-par-categorie",
    );
    expect(slugify("???")).toBe("export");
  });

  it("titleFromMessage tronque la première ligne", () => {
    expect(titleFromMessage("Bonjour\nsuite")).toBe("Bonjour");
    expect(titleFromMessage("a".repeat(80))).toHaveLength(58);
  });
});
