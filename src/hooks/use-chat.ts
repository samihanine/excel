import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { defaultAgent, getAgent } from "@/agents";
import { store } from "@/lib/storage";
import { getErrorMessage } from "@/lib/retry";
import { useCollection, useStoredValue } from "@/hooks/use-store";

/**
 * État du chat : conversation courante, dataset sélectionné, envoi d'un message.
 * La conversation est créée au premier message et liée au dataset choisi.
 */
export function useChat() {
  const conversationId = useStoredValue(store.currentConversationId);
  const selectedDatasetId = useStoredValue(store.selectedDatasetId);
  const conversations = useCollection(store.conversations);
  const datasets = useCollection(store.datasets);
  const [status, setStatus] = React.useState<string | null>(null);

  const conversation = conversations.find((item) => item.id === conversationId);
  const datasetId = conversation?.datasetId ?? selectedDatasetId;
  const dataset = datasets.find((item) => item.id === datasetId);

  const mutation = useMutation({
    mutationKey: ["chat", "send"],
    mutationFn: async (textContent: string) => {
      if (!dataset) throw new Error("Sélectionne un dataset avant d'écrire.");
      const agent = conversation
        ? getAgent(conversation.agentName)
        : defaultAgent;
      let id = conversation?.id;
      if (!id) {
        id = agent.createConversation({ dataset }).id;
        store.currentConversationId.write(id);
      }
      return agent.sendMessage({
        conversationId: id,
        textContent,
        onStatus: setStatus,
      });
    },
    onSettled: () => setStatus(null),
  });

  return {
    conversation,
    dataset,
    datasets,
    datasetId: datasetId ?? null,
    /** Le dataset est verrouillé dès que la conversation existe. */
    datasetLocked: conversation !== undefined,
    selectDataset: (id: string) => store.selectedDatasetId.write(id),
    openConversation: (id: string | null) => {
      mutation.reset();
      store.currentConversationId.write(id);
    },
    send: (textContent: string) => mutation.mutateAsync(textContent),
    isPending: mutation.isPending,
    status,
    error: mutation.error ? getErrorMessage(mutation.error) : null,
  };
}
