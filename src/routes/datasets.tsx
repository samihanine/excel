import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatasetForm } from "@/components/dataset-form";
import { PageHeader } from "@/components/page-header";
import { useCollection } from "@/hooks/use-store";
import { usePbixToken } from "@/hooks/use-tokens";
import { fetchSemanticModelStructure } from "@/lib/dax";
import { getErrorMessage } from "@/lib/retry";
import { store } from "@/lib/storage";

export const Route = createFileRoute("/datasets")({
  component: DatasetsPage,
  head: () => ({ meta: [{ title: "Datasets" }] }),
});

function DatasetsPage() {
  const datasets = useCollection(store.datasets);
  const pbix = usePbixToken();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [modelToAdd, setModelToAdd] = React.useState<string | null>(null);
  const editing = datasets.find((dataset) => dataset.id === editingId);

  // Un modèle sémantique ne peut être lié qu'à un seul dataset.
  const used = new Set(datasets.map((dataset) => dataset.semanticModelName));
  const availableModels = pbix.semanticModels.filter(
    (model) => !used.has(model.name),
  );

  const addDataset = useMutation({
    mutationKey: ["dataset", "add"],
    mutationFn: async (semanticModelName: string) => {
      const structure = await fetchSemanticModelStructure(semanticModelName);
      return store.datasets.set({
        id: crypto.randomUUID(),
        title: semanticModelName,
        context: "",
        structure,
        examples: [],
        semanticModelName,
      });
    },
    onSuccess: (dataset) => {
      setEditingId(dataset.id);
      setModelToAdd(null);
      if (!store.selectedDatasetId.read()) {
        store.selectedDatasetId.write(dataset.id);
      }
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      <PageHeader
        title="Datasets"
        description="Un dataset relie un modèle sémantique Power BI à un contexte pour l'agent."
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Ajouter un dataset</h2>
        {pbix.status !== "valid" ? (
          <p className="text-sm text-muted-foreground">
            Jeton Power BI{" "}
            {pbix.status === "checking" ? "en vérification" : "invalide"}.{" "}
            <Link to="/tokens" className="underline">
              Configurer les tokens
            </Link>
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Select
              items={availableModels.map((model) => ({
                value: model.name,
                label: model.name,
              }))}
              value={modelToAdd}
              onValueChange={(next) =>
                setModelToAdd(typeof next === "string" ? next : null)
              }
              disabled={availableModels.length === 0 || addDataset.isPending}
            >
              <SelectTrigger
                className="min-w-64 rounded-4xl"
                aria-label="Modèle sémantique"
              >
                <SelectValue
                  placeholder={
                    availableModels.length === 0
                      ? "Tous les modèles sont déjà ajoutés"
                      : "Choisir un modèle sémantique"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.name}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!modelToAdd || addDataset.isPending}
              onClick={() => modelToAdd && addDataset.mutate(modelToAdd)}
            >
              <PlusIcon data-icon="inline-start" />
              {addDataset.isPending ? "Lecture du modèle…" : "Ajouter"}
            </Button>
          </div>
        )}
        {addDataset.isError ? (
          <p className="text-xs text-destructive">
            {getErrorMessage(addDataset.error)}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Mes datasets</h2>
        {datasets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun dataset : ajoute un modèle sémantique ci-dessus.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {datasets.map((dataset) => (
              <li key={dataset.id}>
                <Button
                  variant={dataset.id === editingId ? "secondary" : "outline"}
                  size="sm"
                  onClick={() =>
                    setEditingId(dataset.id === editingId ? null : dataset.id)
                  }
                >
                  {dataset.title || dataset.semanticModelName}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing ? (
        <section className="rounded-2xl border p-5">
          <DatasetForm
            key={editing.id}
            dataset={editing}
            onDelete={() => {
              store.datasets.remove(editing.id);
              if (store.selectedDatasetId.read() === editing.id) {
                store.selectedDatasetId.write(null);
              }
              setEditingId(null);
            }}
          />
        </section>
      ) : null}
    </main>
  );
}
