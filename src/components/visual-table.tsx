import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatValue } from "@/lib/format";
import type { DataRow } from "@/lib/dax";
import type { TableVisual } from "@/schemas/visual-spec-schema";

const NUMERIC = new Set(["number", "integer", "currency", "percent"]);

/** Table paginée simple pour un visuel `table`. */
export const VisualTable = ({
  visual,
  rows,
}: {
  visual: TableVisual;
  rows: DataRow[];
}) => {
  const [page, setPage] = React.useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / visual.pageSize));
  const current = Math.min(page, pageCount - 1);
  const slice = rows.slice(
    current * visual.pageSize,
    (current + 1) * visual.pageSize,
  );

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            {visual.columns.map((column) => (
              <TableHead
                key={column.dataKey}
                className={
                  NUMERIC.has(column.format) ? "text-right" : undefined
                }
              >
                {column.label ?? column.dataKey}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {slice.map((row, index) => (
            <TableRow key={index}>
              {visual.columns.map((column) => (
                <TableCell
                  key={column.dataKey}
                  className={
                    NUMERIC.has(column.format)
                      ? "text-right tabular-nums"
                      : undefined
                  }
                >
                  {formatValue(row[column.dataKey], column.format)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pageCount > 1 ? (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>
            Page {current + 1} / {pageCount} · {rows.length} lignes
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Page précédente"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Page suivante"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      ) : null}
    </div>
  );
};
