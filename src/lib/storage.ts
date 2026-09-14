import { z } from "zod";
import { datasetSchema } from "@/schemas/dataset-schema";
import { conversationSchema } from "@/schemas/conversation-schema";

/**
 * Stockage local typé avec zod.
 * - `defineValue` : une valeur unique sous une clé.
 * - `defineCollection` : des éléments `{ id }` stockés chacun sous leur propre clé
 *   (plus un index d'ids), pour éviter de réécrire toute la liste à chaque changement.
 * Toute écriture émet `STORAGE_EVENT` pour rafraîchir les hooks React.
 */

const PREFIX = "agent:";
export const STORAGE_EVENT = "agent-storage-change";

type Cached = { raw: string | null; value: unknown };
const cache = new Map<string, Cached>();

function getStorage() {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function notify(key: string) {
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }));
}

function readKey<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  const raw = getStorage()?.getItem(key) ?? null;
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  let value = fallback;
  if (raw !== null) {
    try {
      const parsed = schema.safeParse(JSON.parse(raw));
      if (parsed.success) value = parsed.data;
    } catch {
      value = fallback;
    }
  }

  cache.set(key, { raw, value });
  return value;
}

function writeKey(key: string, value: unknown) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
  notify(key);
}

function removeKey(key: string) {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(key);
  cache.delete(key);
  notify(key);
}

export function subscribe(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(STORAGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(STORAGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export type StoredValue<T> = {
  fallback: T;
  read: () => T;
  write: (value: T) => void;
  update: (updater: (current: T) => T) => T;
  remove: () => void;
};

export function defineValue<T>(
  name: string,
  schema: z.ZodType<T>,
  fallback: T,
): StoredValue<T> {
  const key = `${PREFIX}${name}`;
  const read = () => readKey(key, schema, fallback);
  const write = (value: T) => writeKey(key, value);
  return {
    fallback,
    read,
    write,
    update: (updater) => {
      const next = updater(read());
      write(next);
      return next;
    },
    remove: () => removeKey(key),
  };
}

export type StoredCollection<T extends { id: string }> = {
  list: () => T[];
  get: (id: string) => T | undefined;
  set: (item: T) => T;
  update: (id: string, updater: (current: T) => T) => T;
  remove: (id: string) => void;
};

export function defineCollection<T extends { id: string }>(
  name: string,
  schema: z.ZodType<T>,
): StoredCollection<T> {
  const ids = defineValue<string[]>(`${name}:ids`, z.array(z.string()), []);
  const itemKey = (id: string) => `${PREFIX}${name}:${id}`;
  const listCache: Cached = { raw: null, value: [] };

  const get = (id: string) =>
    readKey<T | undefined>(itemKey(id), schema, undefined);

  const list = () => {
    const items = ids
      .read()
      .map(get)
      .filter((item): item is T => item !== undefined);
    // Snapshot stable pour useSyncExternalStore : on ne renvoie une nouvelle
    // référence que si un des éléments a changé.
    const raw = items
      .map((item) => getStorage()?.getItem(itemKey(item.id)))
      .join("\u0000");
    if (listCache.raw !== raw) {
      listCache.raw = raw;
      listCache.value = items;
    }
    return listCache.value as T[];
  };

  const set = (item: T) => {
    const parsed = schema.parse(item);
    writeKey(itemKey(parsed.id), parsed);
    if (!ids.read().includes(parsed.id)) {
      ids.update((current) => [...current, parsed.id]);
    }
    return parsed;
  };

  return {
    list,
    get,
    set,
    update: (id, updater) => {
      const current = get(id);
      if (!current) throw new Error(`Élément « ${id} » introuvable (${name}).`);
      return set(updater(current));
    },
    remove: (id) => {
      removeKey(itemKey(id));
      ids.update((current) => current.filter((value) => value !== id));
    },
  };
}

/** Toutes les clés de l'application, déclarées au même endroit. */
const env = import.meta.env as Record<string, string | undefined>;

export const store = {
  // Les variables d'env servent de valeur initiale ; le stockage fait ensuite foi.
  pbixToken: defineValue(
    "pbix-token",
    z.string(),
    env.VITE_PUBLIC_PBIX_ACCESS_TOKEN ?? "",
  ),
  aiToken: defineValue(
    "ai-token",
    z.string(),
    env.VITE_PUBLIC_AI_API_KEY ?? "",
  ),
  selectedDatasetId: defineValue(
    "selected-dataset-id",
    z.string().nullable(),
    null,
  ),
  currentConversationId: defineValue(
    "current-conversation-id",
    z.string().nullable(),
    null,
  ),
  datasets: defineCollection("dataset", datasetSchema),
  conversations: defineCollection("conversation", conversationSchema),
};
