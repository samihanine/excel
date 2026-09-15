import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchSemanticModelStructure } from "@/lib/dax";
import { getErrorMessage } from "@/lib/retry";
import { store } from "@/lib/storage";
import type { Dataset } from "@/schemas/dataset-schema";

export const DatasetForm = ({
  dataset,
  onDelete,
}: {
  dataset: Dataset;
  onDelete: () => void;
}) => {
  const [draft, setDraft] = React.useState(dataset);
  const dirty =
    draft.title !== dataset.title ||
    draft.context !== dataset.context ||
    draft.structure !== dataset.structure ||
    draft.examples.join("\n") !== dataset.examples.join("\n");

  const patch = (partial: Partial<Dataset>) =>
    setDraft((current) => ({ ...current, ...partial }));

  const refreshStructure = useMutation({
    mutationKey: ["dataset", "structure", dataset.id],
    mutationFn: () => fetchSemanticModelStructure(dataset.semanticModelName),
    onSuccess: (structure) => patch({ structure }),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dataset-title">Titre</Label>
          <Input
            id="dataset-title"
            value={draft.title}
            onChange={(event) => patch({ title: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dataset-model">Modèle sémantique</Label>
          <Input
            id="dataset-model"
            value={dataset.semanticModelName}
            disabled
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="dataset-structure">Structure du modèle</Label>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => refreshStructure.mutate()}
            disabled={refreshStructure.isPending}
          >
            <RefreshCwIcon
              data-icon="inline-start"
              className={
                refreshStructure.isPending ? "animate-spin" : undefined
              }
            />
            Rafraîchir
          </Button>
        </div>
        <Textarea
          id="dataset-structure"
          readOnly
          rows={10}
          className="max-h-96 overflow-y-auto font-mono text-xs"
          value={draft.structure}
          placeholder="Aucune structure récupérée."
        />
        {refreshStructure.isError ? (
          <p className="text-xs text-destructive">
            {getErrorMessage(refreshStructure.error)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dataset-context">Contexte métier</Label>
        <Textarea
          id="dataset-context"
          rows={6}
          placeholder="Règles métier, définitions, périodes disponibles…"
          value={draft.context}
          onChange={(event) => patch({ context: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dataset-examples">
          Exemples de prompts (un par ligne)
        </Label>
        <Textarea
          id="dataset-examples"
          rows={4}
          value={draft.examples.join("\n")}
          onChange={(event) =>
            patch({ examples: event.target.value.split("\n") })
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={!dirty}
          onClick={() => {
            const next = {
              ...dataset,
              title: draft.title.trim() || dataset.semanticModelName,
              context: draft.context,
              structure: draft.structure,
              examples: draft.examples
                .map((line) => line.trim())
                .filter(Boolean),
            };
            store.datasets.set(next);
            setDraft(next);
          }}
        >
          Enregistrer
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2Icon data-icon="inline-start" />
          Supprimer ce dataset
        </Button>
      </div>
    </div>
  );
};
