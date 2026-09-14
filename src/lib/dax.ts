import { z } from "zod";
import { PBIX_ACCESS_TOKEN_STORAGE_KEY, readJson } from "./storage";

export const scalarValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export type ScalarValue = z.infer<typeof scalarValueSchema>;

export const dataRowSchema = z.record(z.string(), scalarValueSchema);

export type DataRow = z.infer<typeof dataRowSchema>;

export const resultColumnSchema = z.object({
  alias: z.string(),
  role: z.enum(["dimension", "metric"]),
  type: z.enum(["string", "integer", "number", "date", "boolean"]),
  format: z.enum(["integer", "number", "currency", "percent"]).optional(),
  source: z.string(),
});

export type ResultColumn = z.infer<typeof resultColumnSchema>;

const POWER_BI_API = "https://api.powerbi.com/v1.0/myorg";

const COLUMN_REF_PATTERN = /^\s*'?([^'[\]]+)'?\s*\[\s*([^\]]+)\s*\]\s*$/;

export class DaxError extends Error {
  readonly details?: string[];

  constructor(message: string, details?: string[]) {
    super(message);
    this.name = "DaxError";
    this.details = details;
  }
}

export interface DaxQueryResult {
  rows: Record<string, unknown>[];
}

export const daxResultSchema = z.object({
  modelId: z.string(),
  columns: z.array(resultColumnSchema),
  rows: z.array(dataRowSchema),
  rowCount: z.number(),
  executionMs: z.number(),
});

export type DaxResult = z.infer<typeof daxResultSchema>;

type Dataset = {
  id: string;
  name: string;
};

type DatasetListResponse = {
  value: Dataset[];
};

type ExecuteQueriesResponse = {
  results?: Array<{
    tables?: Array<{
      rows?: Record<string, unknown>[];
      error?: {
        code?: string;
        message?: string;
      };
    }>;
    error?: {
      code?: string;
      message?: string;
    };
  }>;
};

const datasetIdCache = new Map<string, string>();

/** Lit le jeton Power BI (localStorage, puis `VITE_PUBLIC_PBIX_ACCESS_TOKEN`). */
export function readPbixAccessToken(): string {
  const token = readJson<string>(PBIX_ACCESS_TOKEN_STORAGE_KEY, "");

  if (token) return token;

  throw new DaxError(
    "Jeton Power BI manquant. Collez-le depuis l'onboarding ou lance : bun run pbi:token.",
  );
}

export async function listPowerBiDatasets(
  accessToken = readPbixAccessToken(),
): Promise<Array<{ id: string; name: string }>> {
  const response = await powerBiRequest<DatasetListResponse>(
    "/datasets",
    accessToken,
  );
  return response.value.map((dataset) => ({
    id: dataset.id,
    name: dataset.name,
  }));
}

async function powerBiRequest<T>(
  endpoint: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${POWER_BI_API}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new DaxError(
      extractPowerBiError(
        body,
        `Erreur Power BI HTTP ${response.status} ${response.statusText}`,
      ),
    );
  }

  return JSON.parse(body) as T;
}

export async function resolveDatasetId(
  datasetName: string,
  accessToken = readPbixAccessToken(),
): Promise<string> {
  return findDatasetId(datasetName, accessToken);
}

async function findDatasetId(
  datasetName: string,
  accessToken: string,
): Promise<string> {
  const normalized = datasetName.trim().toLowerCase();
  const cached = datasetIdCache.get(normalized);
  if (cached) return cached;

  const response = await powerBiRequest<DatasetListResponse>(
    "/datasets",
    accessToken,
  );
  const dataset = response.value.find(
    (candidate) => candidate.name.trim().toLowerCase() === normalized,
  );

  if (!dataset) {
    throw new DaxError(
      `Le modèle Power BI « ${datasetName} » est introuvable dans Mon espace de travail.`,
      response.value.map((item) => item.name),
    );
  }

  datasetIdCache.set(normalized, dataset.id);
  return dataset.id;
}

/** Ajoute `EVALUATE` si la requête ne commence pas déjà par EVALUATE ou DEFINE. */
export function ensureEvaluate(dax: string) {
  const trimmed = dax.trim();
  if (!trimmed) return trimmed;
  if (/^(EVALUATE|DEFINE)\b/i.test(trimmed)) return trimmed;
  return `EVALUATE\n${trimmed}`;
}

export function normalizeDaxKey(dax: string) {
  return ensureEvaluate(dax).replace(/\s+/g, " ").trim().toLowerCase();
}

/** Conseil de correction selon l'erreur Power BI. */
export function daxRepairHint(error: string) {
  const reserved = error.match(/syntax for '([^']+)'/i)?.[1];
  if (
    reserved &&
    /^(item|time|date|value|text|true|false|table|column|action|currency|rank)$/i.test(
      reserved,
    )
  ) {
    return `Nom réservé ou syntaxe : utilise '${reserved}'[Colonne], pas ${reserved}[Colonne]. Time, Date, Item et les mots réservés DAX doivent être entre quotes.`;
  }
  if (!/single value|cannot be determined/i.test(error)) return undefined;
  if (/FiscalYear|<oii>Time<\/oii>|KEEPFILTERS|table '<oii>Time/i.test(error)) {
    return "Filtre d'année : CALCULATETABLE(SUMMARIZECOLUMNS(...), 'Time'[FiscalYear] = 2014). Pas de KEEPFILTERS('Time'[Colonne] = …) dans SUMMARIZECOLUMNS ni SELECTCOLUMNS.";
  }
  return "Ne mets pas une colonne de groupe comme expression nommée dans SUMMARIZECOLUMNS. Utilise SELECTCOLUMNS après.";
}

export function isBlankScalar(value: DataRow[string] | undefined) {
  return value === null || value === undefined || value === "";
}

/** Toutes les cellules sont vides : ROW de BLANK, filtre hors données, etc. */
export function isBlankResult(rows: DataRow[], columns?: string[]) {
  if (rows.length === 0) return true;
  return rows.every((row) => {
    const keys = columns?.length ? columns : Object.keys(row);
    return keys.length === 0 || keys.every((key) => isBlankScalar(row[key]));
  });
}

/** Détecte un N-1 vide ou un écart incompatible avec N / N-1. */
export function timeIntelligenceHint(columns: string[], sample: DataRow[]) {
  if (sample.length === 0) return undefined;

  const prior = columns.find(
    (column) => /2013|n-1|lastyear/i.test(column) || /ly$/i.test(column),
  );
  const current = columns.find(
    (column) =>
      column !== prior &&
      (/2014/.test(column) ||
        (/sales|ventes|ca/i.test(column) &&
          !/var|pct|ly|2013|n-1/i.test(column))),
  );
  const variation = columns.find(
    (column) =>
      /variation|ecart|écart|variance/i.test(column) &&
      !/pct|percent|%/i.test(column),
  );

  if (
    prior &&
    current &&
    sample.every((row) => isBlankScalar(row[prior])) &&
    sample.some((row) => typeof row[current] === "number")
  ) {
    return "Année N-1 vide : CALCULATETABLE(..., 'Time'[FiscalYear] = 2014) annule CALCULATE(... = 2013). Pas de filtre année autour. Chaque mesure : CALCULATE([TotalSales], ALL('Time'[FiscalYear]), 'Time'[FiscalYear] = 2013). Si N-1 est vide, l'écart doit rester vide (N - BLANK = N).";
  }

  if (!prior || !current || !variation) return undefined;

  const contradictory = sample.some((row) => {
    const ty = row[current];
    const ly = row[prior];
    const delta = row[variation];
    if (typeof ty !== "number" || typeof delta !== "number") return false;
    if (isBlankScalar(ly) && Math.abs(delta - ty) < 1) return true;
    if (typeof ly !== "number") return false;
    return (ty > ly && delta < 0) || (ty < ly && delta > 0);
  });
  if (!contradictory) return undefined;
  return "Incohérence N / N-1 : l'écart ne correspond pas. Pour une année historique, n'utilise pas [TotalSalesLY] / [Total Sales Variance]. Calcule N et N-1 avec CALCULATE([TotalSales], ALL('Time'[FiscalYear]), 'Time'[FiscalYear] = …).";
}

interface PowerBiErrorBody {
  error?: {
    message?: string;
    "pbi.error"?: {
      details?: Array<{
        code?: string;
        detail?: { value?: string };
      }>;
    };
  };
}

function shortenDaxMessage(message: string) {
  const withoutQuery = message.replace(/^Query\s*\([^)]+\)\s*/i, "");
  const withoutDump = withoutQuery.replace(
    /\s*\((?:VAR|EVALUATE|DEFINE)\b[\s\S]*$/i,
    "",
  );
  const trimmed = (withoutDump.trim() || withoutQuery.trim()).replace(
    /\s+/g,
    " ",
  );
  return trimmed.length > 280 ? `${trimmed.slice(0, 277)}…` : trimmed;
}

/** Extrait le message utile d'une erreur Power BI (JSON HTTP ou texte). */
export function extractPowerBiError(body: string, fallback: string) {
  const raw = body.trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as PowerBiErrorBody;
    const details = parsed.error?.["pbi.error"]?.details ?? [];
    const detail = details.find((item) => item.code === "DetailsMessage")
      ?.detail?.value;
    const message = detail ?? parsed.error?.message;
    if (typeof message === "string" && message.trim()) {
      return shortenDaxMessage(message);
    }
  } catch {
    const embedded = raw.match(/\{[\s\S]*"pbi\.error"[\s\S]*\}/);
    if (embedded) return extractPowerBiError(embedded[0], fallback);
  }
  return raw.length > 280 ? `${raw.slice(0, 277)}…` : raw;
}

export async function executeDax(
  datasetName: string,
  accessToken: string,
  dax: string,
): Promise<DaxQueryResult> {
  const datasetId = await findDatasetId(datasetName, accessToken);
  const query = ensureEvaluate(dax);
  const response = await powerBiRequest<ExecuteQueriesResponse>(
    `/datasets/${encodeURIComponent(datasetId)}/executeQueries`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        queries: [{ query }],
        serializerSettings: { includeNulls: true },
      }),
    },
  );

  const queryError = response.results?.[0]?.error;
  const tableError = response.results?.[0]?.tables?.[0]?.error;
  const error = queryError ?? tableError;

  if (error) {
    throw new DaxError(
      error.message ?? "La requête DAX a échoué.",
      error.code ? [error.code] : undefined,
    );
  }

  return { rows: response.results?.[0]?.tables?.[0]?.rows ?? [] };
}

function normalizeKey(key: string) {
  let value = key.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    value = value.slice(1, -1);
  }
  const match = COLUMN_REF_PATTERN.exec(value);
  return match ? match[2].trim() : value.trim();
}

function toSafeAlias(key: string) {
  const words = normalizeKey(key)
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "col";
  const [first, ...rest] = words;
  const alias =
    first.charAt(0).toLowerCase() +
    first.slice(1) +
    rest.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
  return /^[a-zA-Z]/.test(alias) ? alias : `col${alias}`;
}

function toScalar(value: unknown): ScalarValue {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function inferType(values: ScalarValue[]): ResultColumn["type"] {
  const defined = values.filter((value) => value !== null);
  if (defined.length === 0) return "string";
  if (defined.every((value) => typeof value === "boolean")) return "boolean";
  if (defined.every((value) => typeof value === "number")) {
    return defined.every((value) => Number.isInteger(value))
      ? "integer"
      : "number";
  }
  return "string";
}

export function toRawQueryResult(
  datasetName: string,
  rawRows: Record<string, unknown>[],
  executionMs: number,
): DaxResult {
  if (rawRows.length === 0) {
    return {
      modelId: datasetName,
      columns: [],
      rows: [],
      rowCount: 0,
      executionMs,
    };
  }

  const keyToAlias = new Map<string, string>();
  const used = new Set<string>();
  for (const key of Object.keys(rawRows[0])) {
    const alias = toSafeAlias(key);
    let unique = alias;
    let suffix = 2;
    while (used.has(unique.toLowerCase())) {
      unique = `${alias}${suffix}`;
      suffix += 1;
    }
    used.add(unique.toLowerCase());
    keyToAlias.set(key, unique);
  }

  const rows: DataRow[] = rawRows.map((row) => {
    const output: DataRow = {};
    for (const [key, value] of Object.entries(row)) {
      const alias = keyToAlias.get(key) ?? toSafeAlias(key);
      output[alias] = toScalar(value);
    }
    return output;
  });

  const columns: ResultColumn[] = [...new Set(keyToAlias.values())].map(
    (alias) => {
      const values = rows.map((row) => row[alias] ?? null);
      const defined = values.filter((value) => value !== null);
      const numeric = defined.filter((value) => typeof value === "number");
      return {
        alias,
        role:
          defined.length > 0 && numeric.length === defined.length
            ? ("metric" as const)
            : ("dimension" as const),
        type: inferType(values),
        source: alias,
      };
    },
  );

  return {
    modelId: datasetName,
    columns,
    rows,
    rowCount: rows.length,
    executionMs,
  };
}

export async function runDax(
  datasetName: string,
  dax: string,
  accessToken = readPbixAccessToken(),
): Promise<DaxResult> {
  const startedAt = Date.now();
  const { rows } = await executeDax(datasetName, accessToken, dax);
  return toRawQueryResult(datasetName, rows, Date.now() - startedAt);
}
