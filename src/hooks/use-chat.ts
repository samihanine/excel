import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { defaultAgent, getAgent } from "@/agents";
import { store } from "@/lib/storage";
import { getErrorMessage } from "@/lib/retry";
import { useCollection, useStoredValue } from "@/hooks/use-store";
import type { VisualMention } from "@/components/visual-card";

/** Contexte des visuels cités (@) envoyé au LLM, invisible dans le chat. */
function mentionsPrompt(mentions: VisualMention[]) {
  if (mentions.length === 0) return "";
  const lines = mentions.map(
    (mention) =>
      `- @${mention.title} → artefact \`${mention.artefactId}\`, visuel \`${mention.visualId}\`, DAX : ${mention.daxQuery}`,
  );
  return `\n\n[Visuels cités par l'utilisateur :\n${lines.join("\n")}\nPour modifier un visuel cité : upsertArtefact avec path \`visuals.<index>\` ou remplace le dashboard complet.]`;
}

/**
 * État du chat : conversation courante, dataset, fichiers de contexte, artefacts autorisés.
 * La conversation est créée au premier message (ou à l'ajout d'un onglet).
 */
export function useChat() {
  const conversationId = useStoredValue(store.currentConversationId);
  const selectedDatasetId = useStoredValue(store.selectedDatasetId);
  const conversations = useCollection(store.conversations);
  const datasets = useCollection(store.datasets);
  const contextFiles = useCollection(store.contextFiles);
  const [status, setStatus] = React.useState<string | null>(null);
  const [mentions, setMentions] = React.useState<VisualMention[]>([]);
  const [allowedArtefacts, setAllowedArtefacts] = React.useState(() =>
    defaultAgent.artefacts.map((artefact) => artefact.name),
  );
  const [draftContextFileIds, setDraftContextFileIds] = React.useState(() =>
    store.contextFiles
      .list()
      .filter((file) => file.selectedByDefault)
      .map((file) => file.id),
  );

  const conversation = conversations.find((item) => item.id === conversationId);
  const agent = conversation ? getAgent(conversation.agentName) : defaultAgent;
  const datasetId = conversation?.datasetId ?? selectedDatasetId;
  const dataset = datasets.find((item) => item.id === datasetId);
  const contextFileIds = conversation?.contextFileIds ?? draftContextFileIds;

  /** Crée la conversation si elle n'existe pas encore et renvoie son id. */
  const ensureConversation = () => {
    if (conversation) return conversation.id;
    if (!dataset) throw new Error("Sélectionne un dataset avant de commencer.");
    const id = defaultAgent.createConversation({
      dataset,
      contextFiles: contextFiles.filter((file) =>
        draftContextFileIds.includes(file.id),
      ),
    }).id;
    store.currentConversationId.write(id);
    return id;
  };

  const mutation = useMutation({
    mutationKey: ["chat", "send"],
    mutationFn: async (text: string) => {
      if (!dataset) throw new Error("Sélectionne un dataset avant d'écrire.");
      const id = ensureConversation();
      const cited = mentions;
      setMentions([]);
      const prefix = cited.map((mention) => `@${mention.title}`).join(" ");
      return agent.sendMessage({
        conversationId: id,
        textContent: text + mentionsPrompt(cited),
        displayContent: prefix ? `${prefix} ${text}` : text,
        allowedArtefacts,
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
    /** Dataset et fichiers de contexte sont figés dès que la conversation existe. */
    locked: conversation !== undefined,
    selectDataset: (id: string) => store.selectedDatasetId.write(id),
    contextFiles,
    contextFileIds,
    selectContextFiles: setDraftContextFileIds,
    artefactOptions: agent.artefacts.map((artefact) => artefact.name),
    allowedArtefacts,
    setAllowedArtefacts,
    openConversation: (id: string | null) => {
      mutation.reset();
      setMentions([]);
      store.currentConversationId.write(id);
    },
    ensureConversation: dataset ? ensureConversation : null,
    mentions,
    citeVisual: (mention: VisualMention) =>
      setMentions((current) =>
        current.some((item) => item.visualId === mention.visualId)
          ? current
          : [...current, mention],
      ),
    removeMention: (visualId: string) =>
      setMentions((current) =>
        current.filter((item) => item.visualId !== visualId),
      ),
    send: (text: string) => mutation.mutateAsync(text),
    isPending: mutation.isPending,
    status,
    error: mutation.error ? getErrorMessage(mutation.error) : null,
  };
}
