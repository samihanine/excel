import { createTool } from "@/lib/create-tool";
import { z } from "zod";
import { readJson, writeJson } from "@/lib/storage";

function setAtPath(
  object: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const keys = path.split(".").filter(Boolean);

  if (keys.length === 0) {
    throw new Error("Le chemin JSON ne peut pas être vide.");
  }

  if (
    keys.some((key) => ["__proto__", "constructor", "prototype"].includes(key))
  ) {
    throw new Error("Chemin JSON non autorisé.");
  }

  const result = structuredClone(object);
  let current: Record<string, unknown> = result;

  for (const key of keys.slice(0, -1)) {
    if (
      typeof current[key] !== "object" ||
      current[key] === null ||
      Array.isArray(current[key])
    ) {
      current[key] = {};
    }

    current = current[key] as Record<string, unknown>;
  }

  current[keys.at(-1)!] = value;

  return result;
}

export const upsertJsonTool = createTool({
  name: "upsertJson",
  description:
    "Met à jour une propriété précise d'un objet JSON stocké, via un chemin séparé par des points.",

  parameters: z.object({
    storageKey: z.string(),
    path: z
      .string()
      .describe("Chemin à modifier, par exemple: user.preferences.theme"),
    value: z.unknown().describe("Nouvelle valeur à enregistrer"),
  }),

  response: z.object({
    json: z.string(),
  }),

  prompt: [
    "You are a helpful assistant that updates a specific property in a JSON object.",
  ].join("\n"),

  function: async ({ storageKey, path, value }) => {
    let oldJson = readJson(storageKey, {});

    if (
      typeof oldJson !== "object" ||
      oldJson === null ||
      Array.isArray(oldJson)
    ) {
      oldJson = {} as Record<string, unknown>;
      writeJson(storageKey, oldJson);
    }

    const updatedJson = setAtPath(
      oldJson as Record<string, unknown>,
      path,
      value,
    );

    writeJson(storageKey, updatedJson);

    return {
      json: JSON.stringify(updatedJson),
    };
  },
});
