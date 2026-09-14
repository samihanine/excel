import * as React from "react";
import { AtSignIcon, CodeIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildChart } from "@/components/chart";
import { DaxSheet } from "@/components/dax-sheet";
import { VisualTable } from "@/components/visual-table";
import { useDaxQuery } from "@/hooks/use-dax";
import type { DataRow } from "@/lib/dax";
import { renderTemplate } from "@/lib/format";
import { getErrorMessage } from "@/lib/retry";
import type { VisualSpec } from "@/schemas/visual-spec-schema";

/** Référence d'un visuel citée dans le chat via le bouton @. */
export type VisualMention = {
  artefactId: string;
  visualId: string;
  title: string;
  daxQuery: string;
};

function VisualBody({ visual, rows }: { visual: VisualSpec; rows: DataRow[] }) {
  if (visual.kind === "text") {
    return (
      <p className="text-base leading-relaxed whitespace-pre-line">
        {renderTemplate(visual.template, rows[0] ?? {})}
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aucune donnée renvoyée par la requête.
      </p>
    );
  }
  if (visual.kind === "table") {
    return <VisualTable visual={visual} rows={rows} />;
  }
  return buildChart(visual.chartSpec, rows);
}

export const VisualCard = ({
  visual,
  artefactId,
  datasetName,
  onCite,
  onDelete,
  onSaveDax,
}: {
  visual: VisualSpec;
  artefactId: string;
  datasetName: string;
  onCite: (mention: VisualMention) => void;
  onDelete: () => void;
  onSaveDax: (dax: string) => void;
}) => {
  const [daxOpen, setDaxOpen] = React.useState(false);
  const query = useDaxQuery(datasetName, visual.daxQuery);
  const wide = visual.kind === "table";

  return (
    <Card className={wide ? "lg:col-span-2" : undefined}>
      <CardHeader>
        <CardTitle>{visual.title}</CardTitle>
        {visual.description ? (
          <CardDescription>{visual.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <Skeleton
            style={{
              height:
                visual.kind === "chart" ? visual.chartSpec.options.height : 120,
            }}
          />
        ) : query.isError ? (
          <p className="text-sm text-destructive">
            {getErrorMessage(query.error)}
          </p>
        ) : (
          <VisualBody visual={visual} rows={query.data.rows} />
        )}
      </CardContent>
      <CardFooter className="justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Voir la requête DAX"
          onClick={() => setDaxOpen(true)}
        >
          <CodeIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Citer ce visuel dans le chat"
          onClick={() =>
            onCite({
              artefactId,
              visualId: visual.id,
              title: visual.title,
              daxQuery: visual.daxQuery,
            })
          }
        >
          <AtSignIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Supprimer ce visuel"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2Icon />
        </Button>
      </CardFooter>
      <DaxSheet
        open={daxOpen}
        onOpenChange={setDaxOpen}
        title={visual.title}
        datasetName={datasetName}
        daxQuery={visual.daxQuery}
        onSave={onSaveDax}
      />
    </Card>
  );
};
