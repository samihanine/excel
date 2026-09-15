import * as React from "react";
import { CheckIcon, ClipboardCopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Document } from "@/artefacts/document-artefact";

/** Document éditable : titre, contenu, copie et enregistrement. */
export const DocumentView = ({
  document,
  onSave,
}: {
  document: Document;
  onSave: (next: Document) => void;
}) => {
  const [draft, setDraft] = React.useState(document);
  const [copied, setCopied] = React.useState(false);
  const dirty =
    draft.title !== document.title || draft.content !== document.content;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="document-title">Titre</Label>
        <Input
          id="document-title"
          value={draft.title ?? ""}
          placeholder="Sans titre"
          onChange={(event) =>
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="document-content">Contenu</Label>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              aria-label="Copier le contenu"
              onClick={async () => {
                await navigator.clipboard.writeText(draft.content);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? (
                <CheckIcon data-icon="inline-start" />
              ) : (
                <ClipboardCopyIcon data-icon="inline-start" />
              )}
              {copied ? "Copié" : "Copier"}
            </Button>
            <Button
              size="sm"
              disabled={!dirty || draft.content.trim() === ""}
              onClick={() => {
                const next = {
                  title: draft.title?.trim() || undefined,
                  content: draft.content,
                };
                onSave(next);
                setDraft(next);
              }}
            >
              Enregistrer
            </Button>
          </div>
        </div>
        <Textarea
          id="document-content"
          value={draft.content}
          placeholder="Texte du document…"
          className="min-h-64 overflow-y-auto text-sm leading-relaxed"
          rows={16}
          onChange={(event) =>
            setDraft((current) => ({ ...current, content: event.target.value }))
          }
        />
      </div>
    </div>
  );
};
