import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { listPowerBiDatasets } from "@/lib/dax";
import { checkAiToken } from "@/lib/llm";
import { store } from "@/lib/storage";
import { useCollection, useStoredValue } from "@/hooks/use-store";

const CHECK_INTERVAL_MS = 5_000;

export type TokenStatus = "missing" | "checking" | "valid" | "invalid";

/** Clé de requête sans exposer le jeton en clair. */
const fingerprint = (token: string) => `${token.length}:${token.slice(-4)}`;

function toStatus(
  token: string,
  query: { isPending: boolean; isError: boolean },
) {
  if (!token) return "missing" as const;
  if (query.isPending) return "checking" as const;
  return query.isError ? ("invalid" as const) : ("valid" as const);
}

/** Vérifie le jeton Power BI toutes les 5 s et expose les modèles sémantiques. */
export function usePbixToken() {
  const token = useStoredValue(store.pbixToken);
  const query = useQuery({
    queryKey: ["pbix", "datasets", fingerprint(token)],
    queryFn: () => listPowerBiDatasets(token),
    enabled: token !== "",
    refetchInterval: CHECK_INTERVAL_MS,
    retry: false,
  });
  return {
    token,
    status: toStatus(token, query),
    semanticModels: query.data ?? [],
    error: query.error,
  };
}

/** Vérifie le jeton IA toutes les 5 s. */
export function useAiToken() {
  const token = useStoredValue(store.aiToken);
  const query = useQuery({
    queryKey: ["ai", "check", fingerprint(token)],
    queryFn: () => checkAiToken(token),
    enabled: token !== "",
    refetchInterval: CHECK_INTERVAL_MS,
    retry: false,
  });
  return { token, status: toStatus(token, query), error: query.error };
}

/** Sur l'index : redirige vers /tokens ou /datasets si la configuration est incomplète. */
export function useSetupGuard() {
  const navigate = useNavigate();
  const pbix = usePbixToken();
  const ai = useAiToken();
  const datasets = useCollection(store.datasets);

  const tokensReady = pbix.status === "valid" && ai.status === "valid";
  const tokensBroken =
    ["missing", "invalid"].includes(pbix.status) ||
    ["missing", "invalid"].includes(ai.status);

  React.useEffect(() => {
    if (tokensBroken) void navigate({ to: "/tokens" });
    else if (tokensReady && datasets.length === 0) {
      void navigate({ to: "/datasets" });
    }
  }, [tokensBroken, tokensReady, datasets.length, navigate]);
}
