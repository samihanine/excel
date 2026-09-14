import * as React from "react";
import { CheckIcon, ClipboardCopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="xs"
      aria-label={`Copier ${label}`}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
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
  );
}

/** Bloc de texte copiable, utilisé par les artefacts email et document. */
export const TextBlock = ({ label, text }: { label: string; text: string }) => (
  <section className="flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </h3>
      <CopyButton text={text} label={label} />
    </div>
    <p className="rounded-xl border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap">
      {text}
    </p>
  </section>
);
