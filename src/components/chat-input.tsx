import * as React from "react";
import { AtSignIcon, SendHorizontalIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VisualMention } from "@/components/visual-card";
import { OUTPUT_MODES } from "@/lib/output-mode";
import type { OutputMode } from "@/lib/output-mode";

export const ChatInput = ({
  examples,
  mentions,
  onRemoveMention,
  disabled,
  onSend,
}: {
  examples: string[];
  mentions: VisualMention[];
  onRemoveMention: (visualId: string) => void;
  disabled: boolean;
  onSend: (text: string, outputMode: OutputMode) => void;
}) => {
  const [value, setValue] = React.useState("");
  const [outputMode, setOutputMode] = React.useState<OutputMode>("auto");

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text, outputMode);
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
        className="flex items-stretch gap-2"
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
        <Select
          items={OUTPUT_MODES.map((mode) => ({
            value: mode.value,
            label: mode.label,
          }))}
          value={outputMode}
          onValueChange={(next) => {
            if (typeof next === "string") setOutputMode(next);
          }}
          disabled={disabled}
        >
          <SelectTrigger
            className="h-9 w-36 shrink-0 self-start rounded-4xl"
            aria-label="Type de résultat"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTPUT_MODES.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          size="icon"
          className="self-start"
          aria-label="Envoyer"
          disabled={disabled || !value.trim()}
        >
          <SendHorizontalIcon />
        </Button>
      </form>
    </div>
  );
};
