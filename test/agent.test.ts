// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createAgent, titleFromMessage } from "@/lib/create-agent";
import { createTool } from "@/lib/create-tool";
import { complete } from "@/lib/llm";
import { MAX_TOOL_CALLS } from "@/lib/constants";
import { store } from "@/lib/storage";
import { setAtPath } from "@/tools/upsert-artefact-tool";
import { conversationDump, slugify } from "@/lib/download";
import { appendOutputMode } from "@/lib/output-mode";
import { dashboardArtefact } from "@/artefacts/dashboard-artefact";
import { formatSemanticModelStructure } from "@/lib/dax";
import { runDaxTool } from "@/tools/run-dax-tool";
import { mathTool } from "@/tools/math-tool";
import { excelSchema } from "@/artefacts/excel-artefact";
import { visualSpecSchema } from "@/schemas/visual-spec-schema";
import { formatValue, renderTemplate } from "@/lib/format";
import {
  cellBackground,
  computeRows,
  excelToTsv,
  matchesRule,
} from "@/lib/excel";
import { artefactIdFromName } from "@/lib/artefacts";
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
    expect(conversation.history[1].content).toContain(
      "Interdiction d'appeler INFO.VIEW",
    );
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

  it("sépare le texte affiché de la requête envoyée au LLM", async () => {
    const agent = createTestAgent();
    const { id } = agent.createConversation({ dataset });
    completeMock.mockResolvedValueOnce(
      agentJson("answerUser", { answer: "ok" }),
    );

    const conversation = await agent.sendMessage({
      conversationId: id,
      textContent: appendOutputMode("combien de ventes par zone", "auto"),
      displayContent: "combien de ventes par zone",
    });

    expect(conversation.title).toBe("combien de ventes par zone");
    expect(conversation.messages[0]?.content).toBe(
      "combien de ventes par zone",
    );
    expect(conversation.history[2]?.content).toContain("Mode de rendu : auto.");
    expect(conversation.history[2]?.content).toContain("INFO.VIEW");
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
    const first = data.visuals[0];
    expect(first.title).toBe("Nouveau titre");
    expect(first.kind).toBe("chart");
    if (first.kind === "chart") {
      expect(first.chartSpec.options.showGrid).toBe(true);
    }
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

  it("conversationDump sépare messages, traces et artefacts", () => {
    const dump = conversationDump({
      id: "c1",
      title: "Test",
      agentName: "Analyste",
      datasetId: "d1",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
      messages: [
        {
          id: "m1",
          role: "user",
          content: "hi",
          createdAt: "2026-01-01",
          steps: [],
        },
      ],
      history: [{ role: "system", content: "prompt" }],
      artefacts: [],
    });
    expect(dump.messages).toHaveLength(1);
    expect(dump.traces).toEqual([{ role: "system", content: "prompt" }]);
    expect(dump).not.toHaveProperty("history");
  });

  it("titleFromMessage tronque la première ligne", () => {
    expect(titleFromMessage("Bonjour\nsuite")).toBe("Bonjour");
    expect(titleFromMessage("a".repeat(80))).toHaveLength(58);
  });

  it("appendOutputMode ajoute l'instruction sans modifier le texte utile", () => {
    const result = appendOutputMode(
      "combien de ventes par zone",
      "dashboard-simple",
    );
    expect(result.startsWith("combien de ventes par zone")).toBe(true);
    expect(result).toContain("dashboard simple");
    expect(result).toContain("INFO.VIEW");
  });

  it("runDax refuse les sondes INFO.VIEW", async () => {
    await expect(
      runDaxTool.function(
        { dax: "EVALUATE INFO.VIEW.TABLES()" },
        { conversationId: "c", dataset, artefacts: [] },
      ),
    ).rejects.toThrow("INFO");
  });

  it("inclut les tables de faits masquées et ignore les tables de dates auto", () => {
    const structure = formatSemanticModelStructure({
      tables: [
        { "[Name]": "Store", "[IsHidden]": false },
        { "[Name]": "Sales", "[IsHidden]": true },
        {
          "[Name]": "LocalDateTable_abc",
          "[IsHidden]": true,
        },
      ],
      columns: [
        {
          "[Table]": "Store",
          "[Name]": "Territory",
          "[DataType]": "Text",
          "[Type]": "Data",
          "[IsHidden]": false,
        },
        {
          "[Table]": "Sales",
          "[Name]": "LocationID",
          "[DataType]": "Integer",
          "[Type]": "Data",
          "[IsHidden]": true,
        },
        {
          "[Table]": "Sales",
          "[Name]": "RowNumber-x",
          "[DataType]": "Integer",
          "[Type]": "RowNumber",
          "[IsHidden]": true,
        },
      ],
      measures: [
        {
          "[Table]": "Sales",
          "[Name]": "TotalSales",
          "[DataType]": "Number",
          "[IsHidden]": false,
        },
      ],
      relationships: [
        {
          "[IsActive]": true,
          "[FromTable]": "Sales",
          "[FromColumn]": "LocationID",
          "[ToTable]": "Store",
          "[ToColumn]": "LocationID",
          "[Relationship]": "'Sales'[LocationID] *[<-]1 'Store'[LocationID]",
        },
        {
          "[IsActive]": true,
          "[FromTable]": "Store",
          "[FromColumn]": "OpenDate",
          "[ToTable]": "LocalDateTable_abc",
          "[ToColumn]": "Date",
          "[Relationship]": "Store -> LocalDateTable",
        },
      ],
    });

    expect(structure).toContain("### 'Sales' (masquée, utilisable en DAX)");
    expect(structure).toContain("[TotalSales]");
    expect(structure).toContain("[LocationID]");
    expect(structure).not.toContain("LocalDateTable");
    expect(structure).not.toContain("RowNumber");
  });
});

describe("visuels", () => {
  it("accepte chart (kind par défaut), table et text, refuse les couleurs libres", () => {
    const chart = visualSpecSchema.parse(visual);
    expect(chart.kind).toBe("chart");
    expect(
      visualSpecSchema.safeParse({
        ...visual,
        chartSpec: {
          ...visual.chartSpec,
          series: [{ dataKey: "s", color: "#2563EB" }],
        },
      }).success,
    ).toBe(true);
    const parsed = visualSpecSchema.parse({
      ...visual,
      chartSpec: {
        ...visual.chartSpec,
        series: [{ dataKey: "s", color: "#2563EB" }],
      },
    });
    expect(
      parsed.kind === "chart" && "color" in parsed.chartSpec.series[0],
    ).toBe(false);

    const table = visualSpecSchema.parse({
      id: "t",
      title: "Top",
      daxQuery: "EVALUATE x",
      kind: "table",
      columns: [{ dataKey: "store" }, { dataKey: "ca", format: "currency" }],
    });
    expect(table.kind === "table" && table.pageSize).toBe(10);

    const text = visualSpecSchema.parse({
      id: "k",
      title: "KPI",
      daxQuery: "EVALUATE x",
      kind: "text",
      template: "CA : {{ca|currency}}",
    });
    expect(text.kind).toBe("text");
  });

  it("formate les valeurs et rend les placeholders", () => {
    const plain = (text: string) => text.replace(/[\u202f\u00a0]/g, " ");
    expect(plain(formatValue(1234.5, "integer"))).toBe("1 235");
    expect(plain(formatValue(0.125, "percent"))).toBe("12,5 %");
    expect(formatValue(null)).toBe("—");
    expect(
      plain(
        renderTemplate("CA {{ca|integer}} ({{store}}) {{absent}}", {
          ca: 1000,
          store: "Paris",
        }),
      ),
    ).toBe("CA 1 000 (Paris) {{absent}}");
  });
});

describe("math", () => {
  it("évalue des expressions avec variables et affectations", async () => {
    const { results } = await mathTool.function(
      {
        expressions: [
          "ecart = a - b",
          "round(ecart / b * 100, 1)",
          "import('x')",
        ],
        variables: { a: 150, b: 100 },
      },
      { conversationId: "c", dataset, artefacts: [] },
    );
    expect(results[0].result).toBe(50);
    expect(results[1].result).toBe(50);
    expect(results[2].error).toBeDefined();
  });
});

describe("excel", () => {
  const excel = excelSchema.parse({
    columns: [
      { key: "prix", label: "Prix", type: "currency" },
      { key: "qte", label: "Qté", type: "number" },
      { key: "total", label: "Total", type: "currency", formula: "prix * qte" },
    ],
    rows: [
      { prix: 10, qte: 3 },
      { prix: 5, qte: null },
    ],
    styles: [
      { column: "total", operator: "gte", value: 20, background: "gold" },
    ],
  });

  it("calcule les formules et applique les règles de style", () => {
    const rows = computeRows(excel);
    expect(rows[0].total).toBe(30);
    expect(rows[1].total).toBeNull();
    expect(cellBackground(excel, "total", rows[0].total)).toBe("gold");
    expect(cellBackground(excel, "total", rows[1].total)).toBeUndefined();
    expect(
      matchesRule(
        { column: "x", operator: "contains", value: "ar", background: "muted" },
        "Paris",
      ),
    ).toBe(true);
    expect(
      matchesRule({ column: "x", operator: "empty", background: "muted" }, ""),
    ).toBe(true);
  });

  it("exporte en TSV", () => {
    expect(excelToTsv(excel)).toBe("Prix\tQté\tTotal\n10\t3\t30\n5\t\t");
  });

  it("génère un id d'artefact unique", () => {
    expect(artefactIdFromName("Ventes 2014", [])).toBe("ventes-2014");
    const existing = [
      { id: "ventes-2014", type: "excel", name: "x", data: {}, updatedAt: "" },
    ];
    expect(artefactIdFromName("Ventes 2014", existing)).toBe("ventes-2014-2");
  });
});
