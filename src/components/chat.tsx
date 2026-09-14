import { Link } from "@tanstack/react-router";
import {
  DatabaseIcon,
  DownloadIcon,
  FileTextIcon,
  KeyRoundIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { conversationDump, downloadJson, slugify } from "@/lib/download";
import { ChatInput } from "@/components/chat-input";
import { ChatMessages } from "@/components/chat-messages";
import { ContextFilesSheet } from "@/components/context-files-sheet";
import { ConversationHistorySheet } from "@/components/conversation-history-sheet";
import { CreateConversationButton } from "@/components/create-conversation-button";
import { MultiSelect } from "@/components/multi-select";
import { SelectDataset } from "@/components/select-dataset";
import type { useChat } from "@/hooks/use-chat";

export const Chat = ({ chat }: { chat: ReturnType<typeof useChat> }) => {
  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-1 border-b p-2">
        <SelectDataset
          datasets={chat.datasets}
          value={chat.datasetId}
          onChange={chat.selectDataset}
          disabled={chat.locked || chat.isPending}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Gérer les datasets"
          render={<Link to="/datasets" />}
        >
          <DatabaseIcon />
        </Button>
        <MultiSelect
          label="Contexte"
          icon={<FileTextIcon data-icon="inline-start" />}
          emptyLabel="Sans contexte"
          options={chat.contextFiles.map((file) => ({
            value: file.id,
            label: file.title || "Sans titre",
          }))}
          value={chat.contextFileIds}
          onChange={chat.selectContextFiles}
          disabled={chat.locked || chat.isPending}
        />
        <ContextFilesSheet />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Tokens"
          render={<Link to="/tokens" />}
        >
          <KeyRoundIcon />
        </Button>
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Télécharger la conversation"
          disabled={!chat.conversation}
          onClick={() => {
            if (!chat.conversation) return;
            downloadJson(
              `conversation-${slugify(chat.conversation.title)}`,
              conversationDump(chat.conversation),
            );
          }}
        >
          <DownloadIcon />
        </Button>
        <CreateConversationButton
          onCreate={() => chat.openConversation(null)}
          disabled={chat.isPending || !chat.conversation}
        />
        <ConversationHistorySheet
          currentId={chat.conversation?.id ?? null}
          onOpen={chat.openConversation}
        />
      </header>

      <ChatMessages
        messages={chat.conversation?.messages ?? []}
        status={chat.status}
        error={chat.error}
      />

      <ChatInput
        examples={chat.conversation ? [] : (chat.dataset?.examples ?? [])}
        mentions={chat.mentions}
        onRemoveMention={chat.removeMention}
        artefactOptions={chat.artefactOptions}
        allowedArtefacts={chat.allowedArtefacts}
        onAllowedArtefactsChange={chat.setAllowedArtefacts}
        disabled={chat.isPending || !chat.dataset}
        onSend={(text) => void chat.send(text).catch(() => undefined)}
      />
    </div>
  );
};
