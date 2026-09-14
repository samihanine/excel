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
import { DashboardView } from "@/components/dashboard-view";
import {
  dashboardArtefact,
  dashboardSchema,
} from "@/artefacts/dashboard-artefact";
import type { ArtefactRecord } from "@/schemas/conversation-schema";

/** Rendu par type d'artefact : ajouter une entrée ici pour un nouveau type. */
const renderers: Partial<
  Record<
    string,
    (record: ArtefactRecord, datasetName: string) => React.ReactNode
  >
> = {
  [dashboardArtefact.name]: (record, datasetName) => (
    <DashboardView
      dashboard={dashboardSchema.parse(record.data)}
      datasetName={datasetName}
    />
  ),
};

function ArtefactContent({
  record,
  datasetName,
}: {
  record: ArtefactRecord;
  datasetName: string;
}) {
  const render = renderers[record.type];
  if (!render) {
    return (
      <p className="text-sm text-destructive">
        Type d'artefact inconnu : {record.type}
      </p>
    );
  }
  return render(record, datasetName);
}

export const DisplayArtefact = ({
  artefacts,
  datasetName,
}: {
  artefacts: ArtefactRecord[];
  datasetName: string;
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

  if (artefacts.length === 0) {
    return (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LayoutDashboardIcon />
          </EmptyMedia>
          <EmptyTitle>Aucun artefact</EmptyTitle>
          <EmptyDescription>
            Les tableaux de bord créés par l'agent apparaîtront ici.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
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
      <TabsList
        variant="line"
        className="w-full justify-start overflow-x-auto border-b px-2"
      >
        {artefacts.map((artefact) => (
          <TabsTrigger key={artefact.id} value={artefact.id}>
            {artefact.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {artefacts.map((artefact) => (
        <TabsContent
          key={artefact.id}
          value={artefact.id}
          className="flex-1 overflow-y-auto p-4"
        >
          <ArtefactContent record={artefact} datasetName={datasetName} />
        </TabsContent>
      ))}
    </Tabs>
  );
};
