import * as React from "react";

type InitialValue<T> = T | (() => T);
type SetStoredValue<T> = React.Dispatch<React.SetStateAction<T>>;

const LOCAL_STORAGE_EVENT = "local-storage-change";

function resolveInitialValue<T>(initialValue: InitialValue<T>) {
  return initialValue instanceof Function ? initialValue() : initialValue;
}

function readValue<T>(key: string, initialValue: InitialValue<T>) {
  const fallback = resolveInitialValue(initialValue);

  if (typeof window === "undefined") return fallback;

  const storedValue = window.localStorage.getItem(key);
  if (storedValue === null) return fallback;

  try {
    return JSON.parse(storedValue) as T;
  } catch {
    return fallback;
  }
}

export function useLocalStorage<T>(key: string, initialValue: InitialValue<T>) {
  const initialValueRef = React.useRef(initialValue);
  const [storedValue, setStoredValue] = React.useState<T>(() =>
    readValue(key, initialValue),
  );
  const storedValueRef = React.useRef(storedValue);

  initialValueRef.current = initialValue;
  storedValueRef.current = storedValue;

  React.useEffect(() => {
    const nextValue = readValue(key, initialValueRef.current);
    storedValueRef.current = nextValue;
    setStoredValue(nextValue);
  }, [key]);

  React.useEffect(() => {
    function handleStorageChange(event: Event) {
      if (event instanceof StorageEvent && event.key !== key) return;

      if (
        event instanceof CustomEvent &&
        (event.detail as { key?: string } | undefined)?.key !== key
      ) {
        return;
      }

      const nextValue = readValue(key, initialValueRef.current);
      storedValueRef.current = nextValue;
      setStoredValue(nextValue);
    }

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(LOCAL_STORAGE_EVENT, handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(LOCAL_STORAGE_EVENT, handleStorageChange);
    };
  }, [key]);

  const setValue = React.useCallback<SetStoredValue<T>>(
    (value) => {
      const nextValue =
        value instanceof Function ? value(storedValueRef.current) : value;

      storedValueRef.current = nextValue;
      setStoredValue(nextValue);
      window.localStorage.setItem(key, JSON.stringify(nextValue));
      window.dispatchEvent(
        new CustomEvent(LOCAL_STORAGE_EVENT, { detail: { key } }),
      );
    },
    [key],
  );

  const removeValue = React.useCallback(() => {
    window.localStorage.removeItem(key);
    const nextValue = resolveInitialValue(initialValueRef.current);
    storedValueRef.current = nextValue;
    setStoredValue(nextValue);
    window.dispatchEvent(
      new CustomEvent(LOCAL_STORAGE_EVENT, { detail: { key } }),
    );
  }, [key]);

  return [storedValue, setValue, removeValue] as const;
}
