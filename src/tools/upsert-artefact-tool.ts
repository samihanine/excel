import { createTool } from "@/lib/create-tool";
import { z } from "zod";
import {
  CURRENT_CONVERSATION_STORAGE_KEY,
  readJson,
  writeJson,
} from "@/lib/storage";

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

export const upsertArtefactTool = createTool({
  name: "upsertArtefact",
  description: "Upsert an artefact",

  parameters: z.object({
    artefactId: z.string(),
    value: z.string(),
  }),

  response: z.object({
    artefactJson: z.string(),
  }),

  prompt: [
    "You are a helpful assistant that updates a specific property in a JSON object.",
  ].join("\n"),

  function: async ({ artefactId, value }) => {
    const path = `${CURRENT_CONVERSATION_STORAGE_KEY}-${artefactId}`;
    let oldJson = readJson<any>(path, {});

    if (
      typeof oldJson !== "object" ||
      oldJson === null ||
      Array.isArray(oldJson)
    ) {
      oldJson = {} as Record<string, unknown>;
      writeJson(path, oldJson);
    }

    const updatedJson = setAtPath(
      oldJson as Record<string, unknown>,
      artefactId,
      value,
    );

    writeJson(path, updatedJson);

    return {
      artefactJson: JSON.stringify(updatedJson),
    };
  },
});
