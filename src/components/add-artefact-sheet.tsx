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
import { dashboardArtefact } from "@/artefacts/dashboard-artefact";
import { excelArtefact } from "@/artefacts/excel-artefact";
import type { Excel } from "@/artefacts/excel-artefact";
import { artefactIdFromName, saveArtefact } from "@/lib/artefacts";
import { importExcelFile } from "@/lib/excel";
import { getErrorMessage } from "@/lib/retry";
import type { ArtefactRecord } from "@/schemas/conversation-schema";

const TYPES = [
  { value: dashboardArtefact.name, label: "Dashboard" },
  { value: excelArtefact.name, label: "Excel" },
] as const;

type ArtefactType = (typeof TYPES)[number]["value"];

const EMPTY_EXCEL: Excel = {
  columns: [{ key: "colonne1", label: "Colonne 1", type: "text" }],
  rows: [],
  styles: [],
};

/** Onglet « + » : crée un artefact vide (dashboard ou Excel, éventuellement importé d'un .xlsx). */
export const AddArtefactSheet = ({
  getConversationId,
  artefacts,
  disabled,
  onCreated,
}: {
  /** Crée la conversation si besoin et renvoie son id. */
  getConversationId: () => string;
  artefacts: ArtefactRecord[];
  disabled?: boolean;
  onCreated: (id: string) => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<ArtefactType>(dashboardArtefact.name);
  const [file, setFile] = React.useState<File | null>(null);

  const create = useMutation({
    mutationKey: ["artefact", "create"],
    mutationFn: async () => {
      const name = title.trim() || (type === "excel" ? "Feuille" : "Dashboard");
      const id = artefactIdFromName(name, artefacts);
      const data =
        type === "excel"
          ? {
              ...EMPTY_EXCEL,
              title: name,
              ...(file ? await importExcelFile(file) : {}),
            }
          : { title: name, visuals: [] };
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
              items={TYPES.map((item) => ({
                value: item.value,
                label: item.label,
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
                {TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "excel" ? (
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
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Spinner data-icon="inline-start" /> : null}
            Créer l'onglet
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
