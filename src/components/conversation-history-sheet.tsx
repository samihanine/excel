import * as React from "react";
import { DownloadIcon, HistoryIcon, Trash2Icon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { conversationDump, downloadJson, slugify } from "@/lib/download";
import { store } from "@/lib/storage";
import { useCollection } from "@/hooks/use-store";
import type { Conversation } from "@/schemas/conversation-schema";

function ExportLastN({ conversations }: { conversations: Conversation[] }) {
  const [count, setCount] = React.useState(5);
  const n = Math.min(Math.max(1, count || 1), conversations.length);

  return (
    <form
      className="flex items-center gap-2 border-b p-3"
      onSubmit={(event) => {
        event.preventDefault();
        downloadJson(
          `conversations-${n}-dernieres`,
          conversations.slice(0, n).map(conversationDump),
        );
      }}
    >
      <Input
        type="number"
        min={1}
        max={conversations.length}
        value={count}
        onChange={(event) => setCount(Number(event.target.value))}
        aria-label="Nombre de conversations"
        className="w-20"
      />
      <Button type="submit" variant="outline" size="sm">
        <DownloadIcon data-icon="inline-start" />
        Exporter les {n} dernières
      </Button>
    </form>
  );
}

export const ConversationHistorySheet = ({
  currentId,
  onOpen,
}: {
  currentId: string | null;
  onOpen: (id: string | null) => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const conversations = useCollection(store.conversations);
  const datasets = useCollection(store.datasets);
  const sorted = [...conversations].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Historique" />
        }
      >
        <HistoryIcon />
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Historique</SheetTitle>
          <SheetDescription>
            {sorted.length} conversation{sorted.length > 1 ? "s" : ""}
          </SheetDescription>
        </SheetHeader>
        {sorted.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Aucune conversation enregistrée.
          </p>
        ) : (
          <>
            <ExportLastN conversations={sorted} />
            <ul className="flex flex-col gap-1 p-2">
              {sorted.map((conversation) => {
                const dataset = datasets.find(
                  (item) => item.id === conversation.datasetId,
                );
                return (
                  <li key={conversation.id} className="flex items-center gap-1">
                    <Button
                      variant={
                        conversation.id === currentId ? "secondary" : "ghost"
                      }
                      className="h-auto flex-1 flex-col items-start gap-0.5 rounded-2xl px-3 py-2 text-left whitespace-normal"
                      onClick={() => {
                        onOpen(conversation.id);
                        setOpen(false);
                      }}
                    >
                      <span className="line-clamp-1 text-sm font-medium">
                        {conversation.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {dataset?.title ?? "Dataset supprimé"} ·{" "}
                        {formatDistanceToNow(new Date(conversation.updatedAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Télécharger le JSON de la conversation"
                      onClick={() =>
                        downloadJson(
                          `conversation-${slugify(conversation.title)}`,
                          conversationDump(conversation),
                        )
                      }
                    >
                      <DownloadIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Supprimer la conversation"
                      onClick={() => {
                        store.conversations.remove(conversation.id);
                        if (conversation.id === currentId) onOpen(null);
                      }}
                    >
                      <Trash2Icon />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
