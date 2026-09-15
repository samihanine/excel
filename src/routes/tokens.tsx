import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { TokenField } from "@/components/token-field";
import { useAiToken, usePbixToken } from "@/hooks/use-tokens";
import { store } from "@/lib/storage";

const tokensSearchSchema = z.object({
  "pbi-token": z.string().optional(),
});

export const Route = createFileRoute("/tokens")({
  validateSearch: tokensSearchSchema,
  component: TokensPage,
  head: () => ({ meta: [{ title: "Tokens" }] }),
});

/** Heure d'expiration lue dans le JWT, ou null si le jeton n'en est pas un. */
function tokenExpiry(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp: number };
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
}

function pbixHint(token: string) {
  const expiry = tokenExpiry(token);
  if (!expiry) return "Obtenu avec : bun run pbi:token (ouvre cette page).";
  const label = expiry.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return expiry.getTime() < Date.now()
    ? `Jeton expiré à ${label} : relance bun run pbi:token.`
    : `Jeton valable jusqu'à ${label} (bun run pbi:token pour renouveler).`;
}

function TokensPage() {
  const pbix = usePbixToken();
  const ai = useAiToken();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tokenFromUrl = search["pbi-token"];

  React.useLayoutEffect(() => {
    if (!tokenFromUrl) return;
    store.pbixToken.write(tokenFromUrl);
    void navigate({ to: "/tokens", search: {}, replace: true });
  }, [tokenFromUrl, navigate]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 p-6">
      <PageHeader
        title="Tokens"
        description="Les jetons sont stockés localement et vérifiés toutes les 5 secondes."
      />
      <TokenField
        id="pbix-token"
        label="Jeton Power BI"
        hint={pbixHint(pbix.token)}
        value={pbix.token}
        status={pbix.status}
        error={pbix.error}
        onChange={store.pbixToken.write}
      />
      <TokenField
        id="ai-token"
        label="Jeton IA"
        hint="Clé API du fournisseur de modèles."
        value={ai.token}
        status={ai.status}
        error={ai.error}
        onChange={store.aiToken.write}
      />
    </main>
  );
}
