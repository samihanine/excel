import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { PlayIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { runDax } from "@/lib/dax";
import type { DaxResult } from "@/lib/dax";
import { getErrorMessage } from "@/lib/retry";

const PREVIEW_ROWS = 20;

function Preview({ result }: { result: DaxResult }) {
  const columns = result.columns.map((column) => column.alias);
  return (
    <div className="overflow-auto rounded-xl border text-xs">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-2 py-1 text-left font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.slice(0, PREVIEW_ROWS).map((row, index) => (
            <tr key={index} className="border-t">
              {columns.map((column) => (
                <td key={column} className="px-2 py-1 whitespace-nowrap">
                  {String(row[column] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-2 py-1 text-muted-foreground">
        {result.rowCount} ligne{result.rowCount > 1 ? "s" : ""}
        {result.rowCount > PREVIEW_ROWS ? ` (${PREVIEW_ROWS} affichées)` : ""}
      </p>
    </div>
  );
}

/** Affiche la requête DAX d'un visuel, permet de la modifier, la relancer et l'enregistrer. */
export const DaxSheet = ({
  open,
  onOpenChange,
  title,
  datasetName,
  daxQuery,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  datasetName: string;
  daxQuery: string;
  onSave: (dax: string) => void;
}) => {
  const [value, setValue] = React.useState(daxQuery);
  React.useEffect(() => {
    if (open) setValue(daxQuery);
  }, [open, daxQuery]);

  const run = useMutation({
    mutationKey: ["dax", "preview"],
    mutationFn: (dax: string) => runDax({ datasetName, dax }),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Requête DAX</SheetTitle>
          <SheetDescription>{title}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <Textarea
            aria-label="Requête DAX"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="max-h-80 min-h-40 overflow-y-auto font-mono text-xs"
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={run.isPending || !value.trim()}
              onClick={() => run.mutate(value)}
            >
              {run.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlayIcon data-icon="inline-start" />
              )}
              Relancer
            </Button>
            <Button
              size="sm"
              disabled={!value.trim() || value === daxQuery}
              onClick={() => {
                onSave(value);
                onOpenChange(false);
              }}
            >
              <SaveIcon data-icon="inline-start" />
              Enregistrer dans le visuel
            </Button>
          </div>
          {run.isError ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(run.error)}
            </p>
          ) : null}
          {run.data ? <Preview result={run.data} /> : null}
        </div>
        <SheetFooter className="text-xs text-muted-foreground">
          Enregistrer remplace la requête du visuel ; le graphique se recharge
          avec le nouveau résultat.
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
