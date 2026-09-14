/**
 * Utilitaires de résilience partagés par les agents et les appels externes.
 */

export interface RetryOptions {
  /** Nombre maximal de tentatives (première incluse). */
  attempts?: number;
  /** Délai initial en ms, doublé à chaque tentative. */
  delayMs?: number;
  /** Délai maximal entre deux tentatives. */
  maxDelayMs?: number;
  /** Détermine si une erreur mérite une nouvelle tentative. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

export class RetryError extends Error {
  readonly attempts: number;
  readonly cause: unknown;

  constructor(message: string, attempts: number, cause: unknown) {
    super(message);
    this.name = "RetryError";
    this.attempts = attempts;
    this.cause = cause;
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (
      /query data cannot be undefined|affected query key/i.test(error.message)
    ) {
      return "La vérification du jeton a échoué. Réessaie dans quelques secondes.";
    }
    return error.message;
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Exécute `task` en réessayant avec un backoff exponentiel.
 * `task` reçoit le numéro de tentative (1-indexé) et la dernière erreur.
 */
export async function withRetry<T>(
  task: (attempt: number, lastError: unknown) => Promise<T>,
  {
    attempts = 3,
    delayMs = 500,
    maxDelayMs = 8_000,
    shouldRetry = () => true,
    onRetry,
  }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let current = 1; current <= attempts; current += 1) {
    try {
      return await task(current, lastError);
    } catch (error) {
      lastError = error;
      const isLast = current >= attempts;
      if (isLast || !shouldRetry(error, current)) break;

      onRetry?.(error, current);
      await sleep(Math.min(maxDelayMs, delayMs * 2 ** (current - 1)));
    }
  }

  throw new RetryError(
    `Échec après ${attempts} tentative(s) : ${getErrorMessage(lastError)}`,
    attempts,
    lastError,
  );
}

/** Résultat typé d'une opération pouvant échouer sans interrompre le flux. */
export type Outcome<T> =
  { ok: true; value: T } | { ok: false; error: string; cause: unknown };

export async function attempt<T>(task: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, value: await task() };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error), cause: error };
  }
}

/** Ajoute un délai maximal à une promesse. */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = "opération",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Délai dépassé (${timeoutMs} ms) pour ${label}`)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
