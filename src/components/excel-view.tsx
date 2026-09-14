import * as React from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCopyIcon,
  DownloadIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Excel, ExcelCell, ExcelColumn } from "@/artefacts/excel-artefact";
import {
  cellBackground,
  computeRows,
  downloadExcel,
  excelToTsv,
} from "@/lib/excel";
import type { ExcelRow } from "@/lib/excel";
import { formatValue } from "@/lib/format";
import { slugify } from "@/lib/download";

const PAGE_SIZE = 25;

const BACKGROUNDS: Record<
  NonNullable<ReturnType<typeof cellBackground>>,
  string
> = {
  gold: "bg-gold/40",
  muted: "bg-muted",
  success: "bg-emerald-100 dark:bg-emerald-900/40",
  warning: "bg-amber-100 dark:bg-amber-900/40",
  danger: "bg-red-100 dark:bg-red-900/40",
};

const NUMERIC = new Set<ExcelColumn["type"]>(["number", "currency", "percent"]);

function formatCell(column: ExcelColumn, value: ExcelCell | undefined) {
  if (
    column.type === "boolean" ||
    column.type === "text" ||
    column.type === "select"
  ) {
    return formatValue(value, "text");
  }
  return formatValue(value, column.type);
}

/** Feuille Excel rendue avec TanStack Table : tri, pagination, copie, export .xlsx. */
export const ExcelView = ({ excel, name }: { excel: Excel; name: string }) => {
  const rows = React.useMemo(() => computeRows(excel), [excel]);
  const [copied, setCopied] = React.useState<string | null>(null);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const columns = React.useMemo(() => {
    const helper = createColumnHelper<ExcelRow>();
    return excel.columns.map((column) =>
      helper.accessor((row) => row[column.key] ?? null, {
        id: column.key,
        header: column.label,
        cell: (info) => formatCell(column, info.getValue()),
      }),
    );
  }, [excel.columns]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {excel.title ? (
            <h2 className="text-lg font-semibold">{excel.title}</h2>
          ) : null}
          {excel.description ? (
            <p className="text-sm text-muted-foreground">{excel.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {copied ? `${copied} copié` : null}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copy(excelToTsv(excel, rows), "Tableau")}
          >
            <ClipboardCopyIcon data-icon="inline-start" />
            Copier tout
          </Button>
          <Button
            size="sm"
            onClick={() => void downloadExcel(slugify(name), excel)}
          >
            <DownloadIcon data-icon="inline-start" />
            Télécharger .xlsx
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucune ligne : demande à l'agent d'en ajouter.
        </p>
      ) : null}

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const column = excel.columns.find(
                    (item) => item.key === header.id,
                  );
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "h-10",
                        column && NUMERIC.has(column.type) && "text-right",
                      )}
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground/80"
                        onClick={header.column.getToggleSortingHandler()}
                        title="Trier"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sorted === "asc"
                          ? "↑"
                          : sorted === "desc"
                            ? "↓"
                            : null}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="ml-1 opacity-40 hover:opacity-100"
                        aria-label={`Copier la colonne ${column?.label ?? header.id}`}
                        onClick={() =>
                          copy(
                            rows
                              .map((row) => String(row[header.id] ?? ""))
                              .join("\n"),
                            `Colonne ${column?.label ?? header.id}`,
                          )
                        }
                      >
                        <ClipboardCopyIcon />
                      </Button>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const column = excel.columns.find(
                    (item) => item.key === cell.column.id,
                  );
                  const raw = cell.getValue<ExcelCell | null>();
                  const background = cellBackground(excel, cell.column.id, raw);
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "cursor-copy p-0",
                        column &&
                          NUMERIC.has(column.type) &&
                          "text-right tabular-nums",
                        background && BACKGROUNDS[background],
                      )}
                    >
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-foreground/5"
                        title="Copier la valeur"
                        onClick={() => copy(String(raw ?? ""), "Valeur")}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </button>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {rows.length} ligne{rows.length > 1 ? "s" : ""} ·{" "}
          {excel.columns.length} colonnes
        </span>
        {pageCount > 1 ? (
          <div className="flex items-center gap-2">
            <span>
              Page {pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Page précédente"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Page suivante"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
