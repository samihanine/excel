import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { excelArtefact } from "@/artefacts/excel-artefact";
import type { Artefact } from "@/lib/create-artefact";
import { findArtefact } from "@/lib/create-artefact";
import { artefactIdFromName, saveArtefact } from "@/lib/artefacts";
import { importExcelFile } from "@/lib/excel";
import { getErrorMessage } from "@/lib/retry";
import type { ArtefactRecord } from "@/schemas/conversation-schema";

/** Onglet « + » : crée un artefact vide de n'importe quel type (Excel : import .xlsx possible). */
export const AddArtefactSheet = ({
  types,
  getConversationId,
  artefacts,
  disabled,
  onCreated,
}: {
  types: Artefact[];
  /** Crée la conversation si besoin et renvoie son id. */
  getConversationId: () => string;
  artefacts: ArtefactRecord[];
  disabled?: boolean;
  onCreated: (id: string) => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState(types[0]?.name ?? "");
  const [file, setFile] = React.useState<File | null>(null);

  const create = useMutation({
    mutationKey: ["artefact", "create"],
    mutationFn: async () => {
      const artefact = findArtefact(types, type);
      const name = title.trim() || artefact.name;
      const id = artefactIdFromName(name, artefacts);
      const imported =
        type === excelArtefact.name && file ? await importExcelFile(file) : {};
      const data = { ...(artefact.empty as object), title: name, ...imported };
      return saveArtefact(getConversationId(), { id, type, name, data });
    },
    onSuccess: (record) => {
      onCreated(record.id);
      setOpen(false);
      setTitle("");
      setFile(null);
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Ajouter un onglet"
            disabled={disabled}
          />
        }
      >
        <PlusIcon />
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Nouvel onglet</SheetTitle>
          <SheetDescription>
            L'artefact est créé vide ; l'agent pourra ensuite le remplir.
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-col gap-4 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="artefact-title">Titre</Label>
            <Input
              id="artefact-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ventes 2014"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="artefact-type">Type</Label>
            <Select
              items={types.map((item) => ({
                value: item.name,
                label: item.name,
              }))}
              value={type}
              onValueChange={(next) => {
                if (typeof next === "string") setType(next);
              }}
            >
              <SelectTrigger id="artefact-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((item) => (
                  <SelectItem key={item.name} value={item.name}>
                    <span className="flex flex-col items-start">
                      {item.name}
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === excelArtefact.name ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="artefact-file">
                Importer un fichier .xlsx (optionnel)
              </Label>
              <Input
                id="artefact-file"
                type="file"
                accept=".xlsx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Première feuille, ligne 1 = en-têtes. Les types de colonnes sont
                détectés automatiquement.
              </p>
            </div>
          ) : null}
          {create.isError ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(create.error)}
            </p>
          ) : null}
          <Button type="submit" disabled={create.isPending || !type}>
            {create.isPending ? <Spinner data-icon="inline-start" /> : null}
            Créer l'onglet
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
