import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { TokenField } from "@/components/token-field";
import { useAiToken, usePbixToken } from "@/hooks/use-tokens";
import { store } from "@/lib/storage";

export const Route = createFileRoute("/tokens")({
  component: TokensPage,
  head: () => ({ meta: [{ title: "Tokens" }] }),
});

function TokensPage() {
  const pbix = usePbixToken();
  const ai = useAiToken();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 p-6">
      <PageHeader
        title="Tokens"
        description="Les jetons sont stockés localement et vérifiés toutes les 5 secondes."
      />
      <TokenField
        id="pbix-token"
        label="Jeton Power BI"
        hint="Obtenu avec : bun run pbi:token (Azure CLI)."
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
