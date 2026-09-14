import { createTool } from "@/lib/create-tool";
import { findArtefact } from "@/lib/create-artefact";
import { saveArtefact } from "@/lib/artefacts";
import { store } from "@/lib/storage";
import { z } from "zod";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** Écrit `value` à `path` (ex. `visuals.0.title`) dans une copie de `object`. */
export function setAtPath(object: unknown, path: string, value: unknown) {
  const keys = path.split(".").filter(Boolean);
  if (keys.length === 0)
    throw new Error("Le chemin JSON ne peut pas être vide.");
  if (keys.some((key) => FORBIDDEN_KEYS.has(key))) {
    throw new Error("Chemin JSON non autorisé.");
  }

  const root: unknown = structuredClone(object ?? {});
  let current = root as Record<string, unknown>;

  for (const [index, key] of keys.slice(0, -1).entries()) {
    const nextKey = keys[index + 1];
    const existing = current[key];
    if (typeof existing !== "object" || existing === null) {
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys.at(-1)!] = value;
  return root;
}

export const upsertArtefactTool = createTool({
  name: "upsertArtefact",
  description:
    "Crée ou met à jour un artefact affiché à l'utilisateur. Sans `path`, `value` remplace tout le contenu ; avec `path`, seule cette propriété est modifiée.",
  parameters: z.object({
    type: z.string().min(1),
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    path: z.string().optional(),
    value: z.unknown(),
  }),
  response: z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    data: z.unknown(),
  }),
  prompt: [
    "- `type` : un des types d'artefacts listés plus bas ; `id` : identifiant stable en kebab-case (ex. `ventes-2014`).",
    "- `name` : titre de l'onglet affiché à l'utilisateur (obligatoire à la création).",
    "- Création : envoie tout le contenu dans `value`, sans `path`.",
    "- Retouche : `path` en notation pointée (`visuals.0.title`, `visuals.2`) et `value` la nouvelle valeur.",
    "- Le contenu final est validé par le schéma du type : en cas d'erreur rien n'est écrit, corrige et renvoie.",
    "- Plusieurs artefacts du même type sont possibles, utilise des `id` différents.",
  ].join("\n"),
  function: async (
    { type, id, name, path, value },
    { conversationId, artefacts },
  ) => {
    const artefact = findArtefact(artefacts, type);
    const conversation = store.conversations.get(conversationId);
    if (!conversation) throw new Error("Conversation introuvable.");

    const existing = conversation.artefacts.find(
      (candidate) => candidate.id === id,
    );
    if (existing && existing.type !== type) {
      throw new Error(
        `L'artefact « ${id} » est de type « ${existing.type} », pas « ${type} ».`,
      );
    }
    if (!existing && !name) {
      throw new Error("`name` est obligatoire pour créer un artefact.");
    }

    const merged = path ? setAtPath(existing?.data, path, value) : value;
    const data = artefact.schema.parse(merged);
    return saveArtefact(conversationId, {
      id,
      type,
      name: name ?? existing?.name ?? id,
      data,
    });
  },
});
