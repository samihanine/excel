import { Link } from "@tanstack/react-router";
import { DatabaseIcon, KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/chat-input";
import { ChatMessages } from "@/components/chat-messages";
import { ConversationHistorySheet } from "@/components/conversation-history-sheet";
import { CreateConversationButton } from "@/components/create-conversation-button";
import { SelectDataset } from "@/components/select-dataset";
import type { useChat } from "@/hooks/use-chat";

export const Chat = ({ chat }: { chat: ReturnType<typeof useChat> }) => {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-1 border-b p-2">
        <SelectDataset
          datasets={chat.datasets}
          value={chat.datasetId}
          onChange={chat.selectDataset}
          disabled={chat.datasetLocked || chat.isPending}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Gérer les datasets"
          render={<Link to="/datasets" />}
        >
          <DatabaseIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Tokens"
          render={<Link to="/tokens" />}
        >
          <KeyRoundIcon />
        </Button>
        <span className="flex-1" />
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
        disabled={chat.isPending || !chat.dataset}
        onSend={(text) => void chat.send(text).catch(() => undefined)}
      />
    </div>
  );
};
