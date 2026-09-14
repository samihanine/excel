import * as React from "react";
import { SendHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const ChatInput = ({
  examples,
  disabled,
  onSend,
}: {
  examples: string[];
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
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Textarea
          aria-label="Message"
          placeholder="Écris ton message… (Entrée pour envoyer)"
          rows={2}
          className="min-h-0 resize-none"
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
