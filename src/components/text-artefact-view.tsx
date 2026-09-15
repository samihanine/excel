import * as React from "react";
import {
  BoldIcon,
  CheckIcon,
  ClipboardCopyIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  UnderlineIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeHtml, toDisplayHtml } from "@/components/rich-text";
import type { Document } from "@/artefacts/document-artefact";

const FORMATS = [
  {
    command: "bold",
    label: "Gras",
    shortcut: "Control+B Meta+B",
    icon: BoldIcon,
  },
  {
    command: "italic",
    label: "Italique",
    shortcut: "Control+I Meta+I",
    icon: ItalicIcon,
  },
  {
    command: "underline",
    label: "Souligné",
    shortcut: "Control+U Meta+U",
    icon: UnderlineIcon,
  },
  { command: "insertUnorderedList", label: "Liste à puces", icon: ListIcon },
  {
    command: "insertOrderedList",
    label: "Liste numérotée",
    icon: ListOrderedIcon,
  },
] as const;

function applyFormat(command: string) {
  document.execCommand(command);
}

/** Document éditable, mise en forme type Gmail (gras, italique, souligné, listes). */
export const DocumentView = ({
  value,
  onSave,
}: {
  value: Document;
  onSave: (next: Document) => void;
}) => {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const primed = React.useRef(false);
  const savedHtml = toDisplayHtml(value.content);
  const [title, setTitle] = React.useState(value.title ?? "");
  const [html, setHtml] = React.useState(savedHtml);
  const [copied, setCopied] = React.useState(false);
  const [active, setActive] = React.useState<Record<string, boolean>>({});
  const dirty =
    title !== (value.title ?? "") || sanitizeHtml(html) !== savedHtml;

  const setEditorRef = (node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (node && !primed.current) {
      node.innerHTML = savedHtml;
      primed.current = true;
    }
  };

  const sync = () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerText.trim() === "") editor.innerHTML = "";
    setHtml(editor.innerHTML);
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="document-title">Titre</Label>
        <Input
          id="document-title"
          value={title}
          placeholder="Sans titre"
          onChange={(event) => setTitle(event.target.value)}
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
                const editor = editorRef.current;
                const text = editor?.innerText ?? "";
                const rich = editor?.innerHTML ?? html;
                try {
                  await navigator.clipboard.write([
                    new ClipboardItem({
                      "text/html": new Blob([rich], { type: "text/html" }),
                      "text/plain": new Blob([text], { type: "text/plain" }),
                    }),
                  ]);
                } catch {
                  await navigator.clipboard.writeText(text);
                }
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
              disabled={
                !dirty ||
                !(
                  editorRef.current?.innerText.trim() ||
                  sanitizeHtml(html)
                    .replace(/<[^>]+>/g, "")
                    .trim()
                )
              }
              onClick={() => {
                const next = {
                  title: title.trim() || undefined,
                  content: sanitizeHtml(editorRef.current?.innerHTML ?? html),
                };
                onSave(next);
              }}
            >
              Enregistrer
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-wrap items-center gap-0.5 border-b px-1 py-1">
            {FORMATS.map((format) => (
              <Button
                key={format.command}
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={format.label}
                aria-pressed={active[format.command] === true}
                aria-keyshortcuts={
                  "shortcut" in format ? format.shortcut : undefined
                }
                className={active[format.command] ? "bg-muted" : undefined}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyFormat(format.command);
                  sync();
                }}
              >
                <format.icon />
              </Button>
            ))}
          </div>
          <div
            id="document-content"
            ref={setEditorRef}
            role="textbox"
            aria-multiline="true"
            aria-label="Contenu"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Texte du document…"
            className="min-h-64 px-4 py-3 text-sm leading-relaxed outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
            onInput={sync}
            onKeyUp={sync}
            onMouseUp={sync}
            onPaste={(event) => {
              event.preventDefault();
              const pasted =
                event.clipboardData.getData("text/html") ||
                event.clipboardData.getData("text/plain");
              document.execCommand("insertHTML", false, toDisplayHtml(pasted));
              sync();
            }}
            onKeyDown={(event) => {
              if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
              const key = event.key.toLowerCase();
              if (key !== "b" && key !== "i" && key !== "u") return;
              event.preventDefault();
              applyFormat(
                key === "b" ? "bold" : key === "i" ? "italic" : "underline",
              );
              sync();
            }}
          />
        </div>
      </div>
    </div>
  );
};
