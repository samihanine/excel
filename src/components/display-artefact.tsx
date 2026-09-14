import * as React from "react";
import { LayoutDashboardIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { AddArtefactSheet } from "@/components/add-artefact-sheet";
import { DashboardView } from "@/components/dashboard-view";
import { ExcelView } from "@/components/excel-view";
import type { VisualMention } from "@/components/visual-card";
import {
  dashboardArtefact,
  dashboardSchema,
} from "@/artefacts/dashboard-artefact";
import type { Dashboard } from "@/artefacts/dashboard-artefact";
import { excelArtefact, excelSchema } from "@/artefacts/excel-artefact";
import { updateArtefactData } from "@/lib/artefacts";
import type { ArtefactRecord } from "@/schemas/conversation-schema";

type RenderProps = {
  record: ArtefactRecord;
  conversationId: string;
  datasetName: string;
  onCite: (mention: VisualMention) => void;
};

/** Rendu par type d'artefact : ajouter une entrée ici pour un nouveau type. */
const renderers: Partial<
  Record<string, (props: RenderProps) => React.ReactNode>
> = {
  [dashboardArtefact.name]: ({
    record,
    conversationId,
    datasetName,
    onCite,
  }) => (
    <DashboardView
      artefactId={record.id}
      dashboard={dashboardSchema.parse(record.data)}
      datasetName={datasetName}
      onCite={onCite}
      onChange={(next) =>
        updateArtefactData<Dashboard>(conversationId, record.id, () => next)
      }
    />
  ),
  [excelArtefact.name]: ({ record }) => (
    <ExcelView excel={excelSchema.parse(record.data)} name={record.name} />
  ),
};

function ArtefactContent(props: RenderProps) {
  const render = renderers[props.record.type];
  if (!render) {
    return (
      <p className="text-sm text-destructive">
        Type d'artefact inconnu : {props.record.type}
      </p>
    );
  }
  try {
    return render(props);
  } catch (error) {
    return (
      <p className="text-sm text-destructive">
        Artefact invalide :{" "}
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }
}

export const DisplayArtefact = ({
  artefacts,
  conversationId,
  getConversationId,
  datasetName,
  onCite,
}: {
  artefacts: ArtefactRecord[];
  conversationId: string | null;
  getConversationId: (() => string) | null;
  datasetName: string;
  onCite: (mention: VisualMention) => void;
}) => {
  const latest = artefacts.reduce<ArtefactRecord | undefined>(
    (best, item) => (!best || item.updatedAt > best.updatedAt ? item : best),
    undefined,
  );
  const [selected, setSelected] = React.useState<string | null>(null);

  // Sélectionne automatiquement le dernier artefact modifié.
  React.useEffect(() => {
    if (latest) setSelected(latest.id);
  }, [latest?.id, latest?.updatedAt]);

  const addTab = getConversationId ? (
    <AddArtefactSheet
      getConversationId={getConversationId}
      artefacts={artefacts}
      onCreated={setSelected}
    />
  ) : null;

  if (artefacts.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-11 items-center border-b px-2">{addTab}</div>
        <Empty className="flex-1 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayoutDashboardIcon />
            </EmptyMedia>
            <EmptyTitle>Aucun artefact</EmptyTitle>
            <EmptyDescription>
              Les tableaux de bord et feuilles créés par l'agent apparaîtront
              ici. Tu peux aussi ajouter un onglet avec le bouton +.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const value = artefacts.some((item) => item.id === selected)
    ? selected
    : artefacts[0].id;

  return (
    <Tabs
      value={value}
      onValueChange={(next) => setSelected(String(next))}
      className="h-full gap-0"
    >
      <div className="flex h-11 items-center gap-1 overflow-x-auto border-b px-2">
        <TabsList className="h-8 bg-transparent p-0">
          {artefacts.map((artefact) => (
            <TabsTrigger
              key={artefact.id}
              value={artefact.id}
              className="h-7 flex-none rounded-4xl border border-border px-3 text-xs data-active:border-primary data-active:bg-primary data-active:text-primary-foreground"
            >
              {artefact.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {addTab}
      </div>
      {artefacts.map((artefact) => (
        <TabsContent
          key={artefact.id}
          value={artefact.id}
          className="flex-1 overflow-y-auto p-4"
        >
          {conversationId ? (
            <ArtefactContent
              record={artefact}
              conversationId={conversationId}
              datasetName={datasetName}
              onCite={onCite}
            />
          ) : null}
        </TabsContent>
      ))}
    </Tabs>
  );
};
