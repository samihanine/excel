import { store } from "@/lib/storage";
import type { ArtefactRecord } from "@/schemas/conversation-schema";

/** Crée ou remplace un artefact dans la conversation (utilisé par l'agent et par l'UI). */
export function saveArtefact(
  conversationId: string,
  record: Omit<ArtefactRecord, "updatedAt">,
) {
  const saved: ArtefactRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  };
  store.conversations.update(conversationId, (current) => ({
    ...current,
    updatedAt: saved.updatedAt,
    artefacts: current.artefacts.some((candidate) => candidate.id === saved.id)
      ? current.artefacts.map((candidate) =>
          candidate.id === saved.id ? saved : candidate,
        )
      : [...current.artefacts, saved],
  }));
  return saved;
}

/** Modifie le contenu d'un artefact existant via `updater`. */
export function updateArtefactData<T>(
  conversationId: string,
  artefactId: string,
  updater: (data: T) => T,
) {
  const conversation = store.conversations.get(conversationId);
  const existing = conversation?.artefacts.find(
    (item) => item.id === artefactId,
  );
  if (!existing) throw new Error("Artefact introuvable.");
  return saveArtefact(conversationId, {
    ...existing,
    data: updater(existing.data as T),
  });
}

/** Identifiant kebab-case unique parmi les artefacts existants. */
export function artefactIdFromName(name: string, existing: ArtefactRecord[]) {
  const base =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "artefact";
  let id = base;
  let index = 2;
  while (existing.some((item) => item.id === id)) id = `${base}-${index++}`;
  return id;
}
