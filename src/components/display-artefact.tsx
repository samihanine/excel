import * as React from "react";
import { LayoutDashboardIcon, PrinterIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Artefact } from "@/lib/create-artefact";
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
import { emailArtefact, emailSchema } from "@/artefacts/email-artefact";
import {
  documentArtefact,
  documentSchema,
} from "@/artefacts/document-artefact";
import { TextBlock } from "@/components/text-artefact-view";
import { removeArtefact, updateArtefactData } from "@/lib/artefacts";
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
  [emailArtefact.name]: ({ record }) => {
    const email = emailSchema.parse(record.data);
    return (
      <div className="flex flex-col gap-5">
        {email.to ? <TextBlock label="Destinataire" text={email.to} /> : null}
        <TextBlock label="Objet" text={email.subject} />
        <TextBlock label="Message" text={email.body} />
      </div>
    );
  },
  [documentArtefact.name]: ({ record }) => {
    const document = documentSchema.parse(record.data);
    return (
      <TextBlock
        label={document.title ?? record.name}
        text={document.content}
      />
    );
  },
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
  types,
  conversationId,
  getConversationId,
  datasetName,
  selected,
  onSelect,
  onCite,
}: {
  artefacts: ArtefactRecord[];
  types: Artefact[];
  conversationId: string | null;
  getConversationId: (() => string) | null;
  datasetName: string;
  selected: string | null;
  onSelect: (id: string) => void;
  onCite: (mention: VisualMention) => void;
}) => {
  const latest = artefacts.reduce<ArtefactRecord | undefined>(
    (best, item) => (!best || item.updatedAt > best.updatedAt ? item : best),
    undefined,
  );

  // Sélectionne automatiquement le dernier artefact modifié.
  React.useEffect(() => {
    if (latest) onSelect(latest.id);
  }, [latest?.id, latest?.updatedAt]);

  const addTab = getConversationId ? (
    <AddArtefactSheet
      types={types}
      getConversationId={getConversationId}
      artefacts={artefacts}
      onCreated={onSelect}
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

  const active = artefacts.find((item) => item.id === selected) ?? artefacts[0];

  return (
    <Tabs
      value={active.id}
      onValueChange={(next) => onSelect(String(next))}
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
        <span className="flex-1" />
        {active.type === dashboardArtefact.name ? (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Télécharger en PDF"
            onClick={() => window.print()}
          >
            <PrinterIcon />
          </Button>
        ) : null}
        {conversationId ? (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Supprimer l'onglet ${active.name}`}
            className="text-destructive hover:text-destructive"
            onClick={() => removeArtefact(conversationId, active.id)}
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </div>
      {artefacts.map((artefact) => (
        <TabsContent
          key={artefact.id}
          value={artefact.id}
          data-print-area={artefact.id === active.id ? "" : undefined}
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
