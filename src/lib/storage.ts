export const LOCAL_STORAGE_EVENT = "local-storage-change";

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
