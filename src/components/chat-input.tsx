import * as React from "react";
import {
  AtSignIcon,
  LayersIcon,
  SendHorizontalIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/multi-select";
import type { VisualMention } from "@/components/visual-card";

export const ChatInput = ({
  examples,
  mentions,
  onRemoveMention,
  artefactOptions,
  allowedArtefacts,
  onAllowedArtefactsChange,
  disabled,
  onSend,
}: {
  examples: string[];
  mentions: VisualMention[];
  onRemoveMention: (visualId: string) => void;
  artefactOptions: string[];
  allowedArtefacts: string[];
  onAllowedArtefactsChange: (next: string[]) => void;
  disabled: boolean;
  onSend: (text: string) => void;
}) => {
  const [value, setValue] = React.useState("");

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="flex flex-col gap-2 border-t p-3">
      {examples.length > 0 && !value ? (
        <div className="flex flex-wrap gap-1.5">
          {examples.map((example) => (
            <Button
              key={example}
              variant="outline"
              size="xs"
              className="max-w-full truncate"
              disabled={disabled}
              onClick={() => setValue(example)}
            >
              {example}
            </Button>
          ))}
        </div>
      ) : null}
      {mentions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {mentions.map((mention) => (
            <Badge
              key={mention.visualId}
              variant="outline"
              className="h-6 pr-1"
            >
              <AtSignIcon />
              {mention.title}
              <button
                type="button"
                aria-label={`Retirer ${mention.title}`}
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={() => onRemoveMention(mention.visualId)}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <form
        className="flex items-start gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Textarea
          aria-label="Message"
          placeholder="Écris ton message…"
          rows={1}
          className="max-h-32 min-h-9 min-w-0 flex-1 resize-none py-[7px] leading-5"
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <MultiSelect
          label="Artefacts"
          size="default"
          icon={<LayersIcon data-icon="inline-start" />}
          emptyLabel="Texte seul"
          options={artefactOptions.map((name) => ({
            value: name,
            label: name,
          }))}
          value={allowedArtefacts}
          onChange={onAllowedArtefactsChange}
          disabled={disabled}
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Envoyer"
          disabled={disabled || !value.trim()}
        >
          <SendHorizontalIcon />
        </Button>
      </form>
    </div>
  );
};
