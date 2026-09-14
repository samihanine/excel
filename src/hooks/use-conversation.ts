import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { runAgentTurn } from "@/lib/agent";
import type { AgentEvent } from "@/lib/agent";
import {
  flattenMessageTraces,
  normalizeVisualOrder,
  titleFromMessage,
} from "@/lib/conversation";
import type { Conversation, PendingVisual } from "@/lib/conversation";
import { upsertConversation } from "@/lib/history";
import { DEFAULT_REASONING_LEVEL } from "@/lib/llm";
import type { ReasoningLevel } from "@/lib/llm";
import { getErrorMessage } from "@/lib/retry";
import type { Visual, VisualDaxResult } from "@/lib/visual";
import { applyVisualResult, deleteVisuals } from "@/tools/visuals";

export const agentTurnMutationKey = ["agent-turn"] as const;

export interface SendMessageInput {
  content: string;
  datasetId: string;
  datasetName: string;
  datasetContext: string;
  reasoningLevel: ReasoningLevel;
}

function persist(conversation: Conversation) {
  const next = {
    ...conversation,
    updatedAt: new Date().toISOString(),
  };
  upsertConversation(next);
  return next;
}

function eventLabel(event: AgentEvent) {
  if (
    event.type === "think" ||
    event.type === "visuals" ||
    event.type === "report"
  ) {
    return event.detail;
  }
  return "Rédaction de la réponse";
}

export function useConversation() {
  const [conversation, setConversation] = React.useState<Conversation | null>(
    null,
  );
  const [status, setStatus] = React.useState<string | null>(null);
  const [pendingVisuals, setPendingVisuals] = React.useState<PendingVisual[]>(
    [],
  );
  const abortRef = React.useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationKey: agentTurnMutationKey,
    mutationFn: async (input: SendMessageInput) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const now = new Date().toISOString();
      const startedAt = Date.now();
      const userTurn = { role: "user" as const, content: input.content };
      const base: Conversation = conversation
        ? {
            ...conversation,
            datasetId: input.datasetId,
            datasetName: input.datasetName,
            reasoningLevel: input.reasoningLevel,
            visualOrder: normalizeVisualOrder(
              conversation.visuals,
              conversation.visualOrder,
            ),
            messages: [...conversation.messages, userTurn],
          }
        : {
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
            datasetId: input.datasetId,
            datasetName: input.datasetName,
            reasoningLevel: input.reasoningLevel,
            title: titleFromMessage(input.content),
            visualOrder: [],
            messages: [userTurn],
            traces: [],
            llmMessages: [],
            visuals: [],
          };

      setConversation(base);
      setStatus("Lecture de la demande");

      const result = await runAgentTurn({
        datasetName: input.datasetName,
        datasetContext: input.datasetContext,
        messages: base.messages,
        visuals: base.visuals,
        title: base.title,
        visualOrder: base.visualOrder,
        llmMessages: base.llmMessages,
        reasoningLevel: input.reasoningLevel,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === "visuals") {
            setPendingVisuals(event.pending ?? []);
            if (event.removedIds?.length) {
              setConversation((current) => {
                if (!current) return current;
                const visuals = deleteVisuals(
                  current.visuals,
                  event.removedIds ?? [],
                );
                return {
                  ...current,
                  visuals,
                  visualOrder: normalizeVisualOrder(
                    visuals,
                    current.visualOrder,
                  ),
                };
              });
            }
          } else if (event.type === "report") {
            setPendingVisuals([]);
            setConversation((current) => {
              if (!current) return current;
              const next = {
                ...current,
                visuals: event.visuals,
                visualOrder: event.visualOrder,
                updatedAt: new Date().toISOString(),
              };
              upsertConversation(next);
              return next;
            });
          } else if (event.type === "reply") {
            setPendingVisuals([]);
          }
          setStatus(eventLabel(event));
        },
      });

      const durationSec = Math.max(
        1,
        Math.round((Date.now() - startedAt) / 1000),
      );
      const messages: Conversation["messages"] = [
        ...base.messages,
        {
          role: "assistant",
          content: result.reply,
          at: new Date().toISOString(),
          durationSec,
          actionCount: result.traces.length,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          traces: result.traces,
        },
      ];

      return persist({
        ...base,
        title:
          result.title?.trim() || base.title || titleFromMessage(input.content),
        visualOrder: normalizeVisualOrder(result.visuals, result.visualOrder),
        traces: flattenMessageTraces(messages),
        llmMessages: result.llmMessages,
        visuals: result.visuals,
        messages,
      });
    },
    onSuccess: (next) => {
      setConversation(next);
      setPendingVisuals([]);
      setStatus(null);
    },
    onError: () => {
      setPendingVisuals([]);
      setStatus(null);
    },
    onSettled: () => {
      abortRef.current = null;
    },
  });

  function update(next: Conversation) {
    setConversation(persist(next));
  }

  return {
    conversation,
    isPending: mutation.isPending,
    pendingVisuals,
    status,
    error: mutation.error ? getErrorMessage(mutation.error) : null,
    send: (input: SendMessageInput) => mutation.mutateAsync(input),
    cancel: () => abortRef.current?.abort(),
    reset: () => {
      abortRef.current?.abort();
      setConversation(null);
      setPendingVisuals([]);
      setStatus(null);
      mutation.reset();
    },
    load: (record: Conversation) => {
      abortRef.current?.abort();
      mutation.reset();
      setPendingVisuals([]);
      setStatus(null);
      setConversation(record);
    },
    removeVisual: (id: string) => {
      if (!conversation) return;
      const visuals = deleteVisuals(conversation.visuals, [id]);
      update({
        ...conversation,
        visuals,
        visualOrder: normalizeVisualOrder(visuals, conversation.visualOrder),
      });
    },
    rateVisual: (id: string, rating: number, comment?: string) => {
      if (!conversation) return;
      update({
        ...conversation,
        visuals: conversation.visuals.map((visual) =>
          visual.id === id
            ? {
                ...visual,
                meta: {
                  ...visual.meta,
                  rating,
                  comment: comment || undefined,
                },
              }
            : visual,
        ),
      });
    },
    replaceVisual: (next: Visual) => {
      if (!conversation) return;
      update({
        ...conversation,
        visuals: conversation.visuals.map((visual) =>
          visual.id === next.id ? next : visual,
        ),
      });
    },
    applyVisualQuery: (
      id: string,
      daxQuery: string,
      result: VisualDaxResult,
    ) => {
      if (!conversation) return;
      const current = conversation.visuals.find((visual) => visual.id === id);
      if (!current) return;
      update({
        ...conversation,
        visuals: conversation.visuals.map((visual) =>
          visual.id === id
            ? applyVisualResult(visual, daxQuery, result)
            : visual,
        ),
      });
    },
    reasoningLevel: conversation?.reasoningLevel ?? DEFAULT_REASONING_LEVEL,
  };
}
