import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "@/components/chat";
import { DisplayArtefact } from "@/components/display-artefact";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useChat } from "@/hooks/use-chat";
import { useSetupGuard } from "@/hooks/use-tokens";

export const Route = createFileRoute("/")({
  component: Page,
  head: () => ({
    meta: [{ title: "Agent" }],
  }),
});

function Page() {
  useSetupGuard();
  const chat = useChat();

  return (
    <main className="h-dvh">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="38" minSize={360}>
          <Chat chat={chat} />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel minSize={400}>
          <DisplayArtefact
            artefacts={chat.conversation?.artefacts ?? []}
            datasetName={chat.dataset?.semanticModelName ?? ""}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
