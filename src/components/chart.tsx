"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSpec } from "@/schemas/visual-spec-schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export type ChartRow = {
  [key: string]: string | number | boolean | null | undefined;
};

type ChartSeries = ChartSpec["series"][number];

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

const DEFAULT_Y_AXIS_ID = "left";
const COMPOSED_SERIES_ORDER: Record<ChartSeries["type"], number> = {
  bar: 0,
  area: 1,
  line: 2,
};

// Palette de la charte uniquement : l'agent ne choisit pas les couleurs.
function seriesColor(_series: ChartSeries, index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function yAxisIdFor(series: ChartSeries): string {
  return series.yAxisId ?? DEFAULT_Y_AXIS_ID;
}

function uniqueYAxisIds(series: ChartSpec["series"]): string[] {
  return [...new Set(series.map(yAxisIdFor))];
}

export function buildChartConfig(
  chartSpec: ChartSpec,
  rows: ChartRow[],
): ChartConfig {
  const config: ChartConfig = {};

  for (const [index, series] of chartSpec.series.entries()) {
    config[series.dataKey] = {
      label: series.name ?? series.dataKey,
      color: seriesColor(series, index),
    };
  }

  if (chartSpec.chart !== "pie") {
    return config;
  }

  const nameKey = chartSpec.xAxis?.dataKey;
  if (!nameKey) {
    return config;
  }

  for (const [index, row] of rows.entries()) {
    const name = row[nameKey];
    if (typeof name !== "string" && typeof name !== "number") {
      continue;
    }

    const key = String(name);
    if (key in config) {
      continue;
    }

    config[key] = {
      label: key,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
  }

  return config;
}

function axisLabel(
  label: string | undefined,
  position: "bottom" | "left" | "right",
) {
  if (!label) {
    return undefined;
  }

  if (position === "bottom") {
    return { value: label, position: "insideBottom" as const, offset: -8 };
  }

  return {
    value: label,
    angle: -90,
    position:
      position === "left" ? ("insideLeft" as const) : ("insideRight" as const),
  };
}

function CartesianChrome({ chartSpec }: { chartSpec: ChartSpec }) {
  const yAxisIds = uniqueYAxisIds(chartSpec.series);
  const { xAxis, yAxis, options } = chartSpec;

  return (
    <>
      {options.showGrid ? <CartesianGrid vertical={false} /> : null}
      {xAxis?.hide ? null : (
        <XAxis
          dataKey={xAxis?.dataKey}
          type={xAxis?.type}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
          tickCount={xAxis?.tickCount}
          domain={xAxis?.domain}
          label={axisLabel(xAxis?.label, "bottom")}
        />
      )}
      {yAxis?.hide
        ? null
        : yAxisIds.map((id, index) => {
            const orientation = index === 0 ? "left" : "right";
            return (
              <YAxis
                key={id}
                yAxisId={id}
                orientation={orientation}
                type={yAxis?.type ?? "number"}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickCount={yAxis?.tickCount}
                domain={yAxis?.domain}
                label={axisLabel(
                  index === 0 ? yAxis?.label : undefined,
                  orientation,
                )}
              />
            );
          })}
      {options.showTooltip ? (
        <ChartTooltip
          cursor={chartSpec.chart === "bar"}
          content={<ChartTooltipContent />}
        />
      ) : null}
      {options.showLegend ? (
        <ChartLegend content={<ChartLegendContent />} />
      ) : null}
    </>
  );
}

function SeriesShape({
  series,
  index,
  chartSpec,
  geometry,
}: {
  series: ChartSeries;
  index: number;
  chartSpec: ChartSpec;
  geometry: ChartSeries["type"];
}) {
  const color = seriesColor(series, index);
  const animate = chartSpec.options.animate;
  const yAxisId = yAxisIdFor(series);

  if (geometry === "bar") {
    return (
      <Bar
        dataKey={series.dataKey}
        name={series.name ?? series.dataKey}
        fill={color}
        radius={4}
        stackId={series.stackId}
        yAxisId={yAxisId}
        isAnimationActive={animate}
      />
    );
  }

  if (geometry === "area") {
    return (
      <Area
        type="monotone"
        dataKey={series.dataKey}
        name={series.name ?? series.dataKey}
        stroke={color}
        fill={color}
        fillOpacity={0.2}
        strokeWidth={2}
        stackId={series.stackId}
        yAxisId={yAxisId}
        dot={series.showDots}
        isAnimationActive={animate}
      />
    );
  }

  return (
    <Line
      type="monotone"
      dataKey={series.dataKey}
      name={series.name ?? series.dataKey}
      stroke={color}
      strokeWidth={2}
      yAxisId={yAxisId}
      dot={series.showDots}
      isAnimationActive={animate}
    />
  );
}

function renderSeries(
  chartSpec: ChartSpec,
  geometry: ChartSeries["type"] | "composed",
): ReactNode {
  const series =
    geometry === "composed"
      ? [...chartSpec.series].sort(
          (left, right) =>
            COMPOSED_SERIES_ORDER[left.type] -
            COMPOSED_SERIES_ORDER[right.type],
        )
      : chartSpec.series;

  return series.map((item) => (
    <SeriesShape
      key={item.dataKey}
      series={item}
      index={chartSpec.series.indexOf(item)}
      chartSpec={chartSpec}
      geometry={geometry === "composed" ? item.type : geometry}
    />
  ));
}

function cartesianMargin(chartSpec: ChartSpec) {
  const hasRightAxis = uniqueYAxisIds(chartSpec.series).length > 1;

  return {
    top: 12,
    right: hasRightAxis ? 20 : 12,
    bottom: chartSpec.xAxis?.label ? 28 : 12,
    left: chartSpec.yAxis?.label ? 16 : 8,
  };
}

function pieSliceFills(chartSpec: ChartSpec, rows: ChartRow[]): string[] {
  const nameKey = chartSpec.xAxis?.dataKey;
  const config = buildChartConfig(chartSpec, rows);

  return rows.map((row, index) => {
    const name = nameKey ? row[nameKey] : undefined;
    const fromConfig =
      typeof name === "string" || typeof name === "number"
        ? config[String(name)].color
        : undefined;

    return fromConfig ?? CHART_COLORS[index % CHART_COLORS.length];
  });
}

function renderRechartsChart(chartSpec: ChartSpec, rows: ChartRow[]) {
  const margin = cartesianMargin(chartSpec);
  const common = {
    data: rows,
    margin,
    accessibilityLayer: true,
  } as const;

  switch (chartSpec.chart) {
    case "line":
      return (
        <LineChart {...common}>
          <CartesianChrome chartSpec={chartSpec} />
          {renderSeries(chartSpec, "line")}
        </LineChart>
      );
    case "bar":
      return (
        <BarChart {...common}>
          <CartesianChrome chartSpec={chartSpec} />
          {renderSeries(chartSpec, "bar")}
        </BarChart>
      );
    case "area":
      return (
        <AreaChart {...common}>
          <CartesianChrome chartSpec={chartSpec} />
          {renderSeries(chartSpec, "area")}
        </AreaChart>
      );
    case "composed":
      return (
        <ComposedChart {...common}>
          <CartesianChrome chartSpec={chartSpec} />
          {renderSeries(chartSpec, "composed")}
        </ComposedChart>
      );
    case "pie": {
      const nameKey = chartSpec.xAxis?.dataKey;
      const { options } = chartSpec;
      const fills = pieSliceFills(chartSpec, rows);

      return (
        <PieChart accessibilityLayer>
          {options.showTooltip ? (
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          ) : null}
          {options.showLegend ? (
            <ChartLegend content={<ChartLegendContent nameKey={nameKey} />} />
          ) : null}
          {chartSpec.series.map((series, seriesIndex) => {
            const ringCount = chartSpec.series.length;
            const outerRadius = 110 - seriesIndex * 28;
            const innerRadius =
              ringCount === 1 ? 0 : Math.max(outerRadius - 24, 0);

            return (
              <Pie
                key={series.dataKey}
                data={rows}
                dataKey={series.dataKey}
                nameKey={nameKey}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                strokeWidth={2}
                isAnimationActive={options.animate}
              >
                {fills.map((fill, index) => (
                  <Cell key={`${series.dataKey}-${index}`} fill={fill} />
                ))}
              </Pie>
            );
          })}
        </PieChart>
      );
    }
  }
}

export function buildChart(chartSpec: ChartSpec, rows: ChartRow[]) {
  const height = chartSpec.options.height;

  return (
    <div className="w-full" style={{ height }}>
      <ChartContainer
        config={buildChartConfig(chartSpec, rows)}
        className="h-full w-full [&_.recharts-responsive-container]:h-full [&_.recharts-responsive-container]:w-full"
        style={{ aspectRatio: "auto", height: "100%", width: "100%" }}
        initialDimension={{ width: 640, height }}
      >
        {renderRechartsChart(chartSpec, rows)}
      </ChartContainer>
    </div>
  );
}

export function Chart({
  chartSpec,
  rows,
}: {
  chartSpec: ChartSpec;
  rows: ChartRow[];
}) {
  return (
    <Card>
      {chartSpec.title || chartSpec.description ? (
        <CardHeader>
          {chartSpec.title ? <CardTitle>{chartSpec.title}</CardTitle> : null}
          {chartSpec.description ? (
            <CardDescription>{chartSpec.description}</CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent>
        {rows.length === 0 ? (
          <Empty className="min-h-48 border border-dashed">
            <EmptyHeader>
              <EmptyTitle>Aucune donnée</EmptyTitle>
              <EmptyDescription>
                Impossible d&apos;afficher le graphique sans lignes.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          buildChart(chartSpec, rows)
        )}
      </CardContent>
    </Card>
  );
}
