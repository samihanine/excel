import * as React from "react";
import { subscribe } from "@/lib/storage";
import type { StoredCollection, StoredValue } from "@/lib/storage";

const EMPTY: never[] = [];

/** Lit une valeur du stockage local et se met à jour à chaque écriture. */
export function useStoredValue<T>(value: StoredValue<T>) {
  return React.useSyncExternalStore(
    subscribe,
    value.read,
    () => value.fallback,
  );
}

/** Liste les éléments d'une collection et se met à jour à chaque écriture. */
export function useCollection<T extends { id: string }>(
  collection: StoredCollection<T>,
) {
  return React.useSyncExternalStore(
    subscribe,
    collection.list,
    () => EMPTY as T[],
  );
}
