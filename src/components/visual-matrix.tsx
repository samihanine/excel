import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatValue } from "@/lib/format";
import type { DataRow, ScalarValue } from "@/lib/dax";
import type { MatrixVisual } from "@/schemas/visual-spec-schema";

const NUMERIC = new Set(["number", "integer", "currency", "percent"]);

function toNumber(value: ScalarValue | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function add(left: number | null, right: number | null) {
  if (left === null) return right;
  if (right === null) return left;
  return left + right;
}

function pivot(visual: MatrixVisual, data: DataRow[]) {
  const rowKeys = visual.rows.map((field) => field.dataKey);
  const columnKey = visual.columns.dataKey;
  const valueKeys = visual.values.map((field) => field.dataKey);
  const columnValues: string[] = [];
  const rowOrder: string[] = [];
  const rowLabels = new Map<string, string[]>();
  const cells = new Map<string, Map<string, Record<string, ScalarValue>>>();

  for (const row of data) {
    const rowId = rowKeys.map((key) => String(row[key] ?? "")).join("\0");
    const columnId = String(row[columnKey] ?? "—");
    if (!rowLabels.has(rowId)) {
      rowLabels.set(
        rowId,
        rowKeys.map((key) => String(row[key] ?? "—")),
      );
      rowOrder.push(rowId);
      cells.set(rowId, new Map());
    }
    if (!columnValues.includes(columnId)) columnValues.push(columnId);
    const byColumn = cells.get(rowId)!;
    const current = byColumn.get(columnId) ?? {};
    for (const key of valueKeys) current[key] = row[key] ?? null;
    byColumn.set(columnId, current);
  }

  const rows = rowOrder.map((rowId) => {
    const byColumn = cells.get(rowId)!;
    const totals: Record<string, number | null> = {};
    for (const key of valueKeys) {
      totals[key] = columnValues.reduce(
        (sum, columnId) => add(sum, toNumber(byColumn.get(columnId)?.[key])),
        null as number | null,
      );
    }
    return { id: rowId, labels: rowLabels.get(rowId)!, byColumn, totals };
  });

  const columnTotals = Object.fromEntries(
    columnValues.map((columnId) => [
      columnId,
      Object.fromEntries(
        valueKeys.map((key) => [
          key,
          rows.reduce(
            (sum, row) => add(sum, toNumber(row.byColumn.get(columnId)?.[key])),
            null as number | null,
          ),
        ]),
      ),
    ]),
  ) as Record<string, Record<string, number | null>>;

  const grandTotals = Object.fromEntries(
    valueKeys.map((key) => [
      key,
      rows.reduce(
        (sum, row) => add(sum, row.totals[key]),
        null as number | null,
      ),
    ]),
  ) as Record<string, number | null>;

  return { columnValues, rows, columnTotals, grandTotals };
}

function NumericCell({
  value,
  format,
}: {
  value: ScalarValue | number | null | undefined;
  format: MatrixVisual["values"][number]["format"];
}) {
  return (
    <TableCell
      className={NUMERIC.has(format) ? "text-right tabular-nums" : undefined}
    >
      {formatValue(value ?? null, format)}
    </TableCell>
  );
}

/** Matrice pivotée (lignes × colonnes × mesures), avec totaux et pagination des lignes. */
export const VisualMatrix = ({
  visual,
  rows: data,
}: {
  visual: MatrixVisual;
  rows: DataRow[];
}) => {
  const matrix = React.useMemo(() => pivot(visual, data), [visual, data]);
  const [page, setPage] = React.useState(0);
  const pageCount = Math.max(
    1,
    Math.ceil(matrix.rows.length / visual.pageSize),
  );
  const current = Math.min(page, pageCount - 1);
  const slice = matrix.rows.slice(
    current * visual.pageSize,
    (current + 1) * visual.pageSize,
  );
  const multi = visual.values.length > 1;
  const colSpan = visual.values.length;

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            {visual.rows.map((field) => (
              <TableHead key={field.dataKey} rowSpan={multi ? 2 : 1}>
                {field.label ?? field.dataKey}
              </TableHead>
            ))}
            {matrix.columnValues.map((columnId) => (
              <TableHead
                key={columnId}
                colSpan={colSpan}
                className="text-center"
              >
                {columnId}
              </TableHead>
            ))}
            <TableHead colSpan={colSpan} className="text-center">
              Total
            </TableHead>
          </TableRow>
          {multi ? (
            <TableRow>
              {matrix.columnValues.flatMap((columnId) =>
                visual.values.map((field) => (
                  <TableHead
                    key={`${columnId}-${field.dataKey}`}
                    className="text-right"
                  >
                    {field.label ?? field.dataKey}
                  </TableHead>
                )),
              )}
              {visual.values.map((field) => (
                <TableHead
                  key={`total-${field.dataKey}`}
                  className="text-right"
                >
                  {field.label ?? field.dataKey}
                </TableHead>
              ))}
            </TableRow>
          ) : null}
        </TableHeader>
        <TableBody>
          {slice.map((row) => (
            <TableRow key={row.id}>
              {row.labels.map((label, index) => (
                <TableCell key={visual.rows[index].dataKey}>{label}</TableCell>
              ))}
              {matrix.columnValues.flatMap((columnId) =>
                visual.values.map((field) => (
                  <NumericCell
                    key={`${columnId}-${field.dataKey}`}
                    value={row.byColumn.get(columnId)?.[field.dataKey]}
                    format={field.format}
                  />
                )),
              )}
              {visual.values.map((field) => (
                <NumericCell
                  key={`total-${field.dataKey}`}
                  value={row.totals[field.dataKey]}
                  format={field.format}
                />
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={visual.rows.length}>Total</TableCell>
            {matrix.columnValues.flatMap((columnId) =>
              visual.values.map((field) => (
                <NumericCell
                  key={`${columnId}-${field.dataKey}`}
                  value={matrix.columnTotals[columnId]?.[field.dataKey]}
                  format={field.format}
                />
              )),
            )}
            {visual.values.map((field) => (
              <NumericCell
                key={`grand-${field.dataKey}`}
                value={matrix.grandTotals[field.dataKey]}
                format={field.format}
              />
            ))}
          </TableRow>
        </TableFooter>
      </Table>
      {pageCount > 1 ? (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>
            Page {current + 1} / {pageCount} · {matrix.rows.length} lignes
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
