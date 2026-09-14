import * as React from "react";
import { ChevronRightIcon } from "lucide-react";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";
import type { AgentStep, ChatMessage } from "@/schemas/conversation-schema";

function Steps({ steps }: { steps: AgentStep[] }) {
  if (steps.length === 0) return null;
  return (
    <Collapsible className="max-w-[80%] text-xs text-muted-foreground">
      <CollapsibleTrigger className="group flex items-center gap-1 hover:text-foreground">
        <ChevronRightIcon className="size-3 transition-transform group-data-panel-open:rotate-90" />
        {steps.length} étape{steps.length > 1 ? "s" : ""}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 flex flex-col gap-2">
        {steps.map((step, index) => (
          <details key={index} className="rounded-xl border bg-muted/40 p-2">
            <summary className="cursor-pointer font-medium">
              {step.tool}
            </summary>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(
                { parameters: step.parameters, output: step.output },
                null,
                2,
              )}
            </pre>
          </details>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export const ChatMessages = ({
  messages,
  status,
  error,
}: {
  messages: ChatMessage[];
  status: string | null;
  error: string | null;
}) => {
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, status]);

  if (messages.length === 0 && !status) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Pose une question sur le dataset, ou demande un tableau de bord.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={
            message.role === "user"
              ? "flex flex-col items-end gap-1"
              : "flex flex-col items-start gap-1"
          }
        >
          <Bubble
            variant={message.role === "user" ? "default" : "muted"}
            data-align={message.role === "user" ? "end" : "start"}
          >
            <BubbleContent className="whitespace-pre-wrap">
              {message.content}
            </BubbleContent>
          </Bubble>
          {message.role === "assistant" ? (
            <Steps steps={message.steps} />
          ) : null}
        </div>
      ))}
      {status ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner className="size-3" />
          {status}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div ref={endRef} />
    </div>
  );
};
