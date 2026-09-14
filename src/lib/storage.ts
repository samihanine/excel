export const LOCAL_STORAGE_EVENT = "local-storage-change";
export const SEMANTIC_MODELS_STORAGE_KEY = "semantic-models";
export const CURRENT_SEMANTIC_MODEL_STORAGE_KEY = "current-semantic-model";
export const CONVERSATIONS_STORAGE_KEY = "conversations";
export const CURRENT_CONVERSATION_STORAGE_KEY = "current-conversation";
export const PBIX_ACCESS_TOKEN_STORAGE_KEY = "pbix-access-token";

export function readJson<T>(storageKey: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(storageKey);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(storageKey: string, value: T) {
  window.localStorage.setItem(storageKey, JSON.stringify(value));
  window.dispatchEvent(
    new CustomEvent(LOCAL_STORAGE_EVENT, { detail: { storageKey } }),
  );
}
