import * as React from "react";
import { FileTextIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { store } from "@/lib/storage";
import { useCollection } from "@/hooks/use-store";
import type { ContextFile } from "@/schemas/context-file-schema";

function ContextFileForm({ file }: { file: ContextFile }) {
  const [draft, setDraft] = React.useState(file);
  const dirty =
    draft.title !== file.title ||
    draft.content !== file.content ||
    draft.selectedByDefault !== file.selectedByDefault;

  return (
    <li className="flex flex-col gap-2 rounded-2xl border p-3">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Titre du fichier"
          value={draft.title}
          placeholder="Titre"
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Supprimer le fichier"
          onClick={() => store.contextFiles.remove(file.id)}
        >
          <Trash2Icon />
        </Button>
      </div>
      <Textarea
        aria-label="Contenu du fichier"
        value={draft.content}
        placeholder="Contenu texte injecté en début de conversation…"
        className="max-h-64 min-h-28 overflow-y-auto text-xs"
        onChange={(event) =>
          setDraft((current) => ({ ...current, content: event.target.value }))
        }
      />
      <Label className="flex items-center gap-2 text-xs">
        <Checkbox
          checked={draft.selectedByDefault}
          onCheckedChange={(checked) =>
            setDraft((current) => ({
              ...current,
              selectedByDefault: checked === true,
            }))
          }
        />
        Sélectionné par défaut
      </Label>
      <Button
        size="sm"
        className="self-start"
        disabled={!dirty}
        onClick={() => {
          const next = {
            ...file,
            title: draft.title.trim() || "Sans titre",
            content: draft.content,
            selectedByDefault: draft.selectedByDefault,
          };
          store.contextFiles.set(next);
          setDraft(next);
        }}
      >
        Enregistrer
      </Button>
    </li>
  );
}

/** Gestion des fichiers de contexte (texte libre, indépendants du dataset). */
export const ContextFilesSheet = () => {
  const [open, setOpen] = React.useState(false);
  const files = useCollection(store.contextFiles);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Gérer les fichiers de contexte"
          />
        }
      >
        <FileTextIcon />
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Fichiers de contexte</SheetTitle>
          <SheetDescription>
            Textes ajoutés au début des conversations qui les sélectionnent.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4">
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              store.contextFiles.set({
                id: crypto.randomUUID(),
                title: "",
                content: "",
                selectedByDefault: false,
              })
            }
          >
            <PlusIcon data-icon="inline-start" />
            Nouveau fichier
          </Button>
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun fichier de contexte.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {files.map((file) => (
                <ContextFileForm key={file.id} file={file} />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
