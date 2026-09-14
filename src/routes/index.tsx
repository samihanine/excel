import { createFileRoute } from "@tanstack/react-router";
import type { ChartRow } from "@/components/chart";
import { Chart } from "@/components/chart";
import type { ChartSpec } from "@/schemas/dashboard-schema";
import { chartSpecSchema } from "@/schemas/dashboard-schema";

export const Route = createFileRoute("/")({
  component: Page,
  head: () => ({
    meta: [{ title: "Agent" }],
  }),
});

const monthlyRows: ChartRow[] = [
  {
    mois: "Jan",
    ca: 420,
    volume: 118,
    conversion: 2.4,
    desktop: 186,
    mobile: 80,
  },
  {
    mois: "Fév",
    ca: 380,
    volume: 102,
    conversion: 2.1,
    desktop: 305,
    mobile: 200,
  },
  {
    mois: "Mar",
    ca: 510,
    volume: 141,
    conversion: 2.8,
    desktop: 237,
    mobile: 120,
  },
  {
    mois: "Avr",
    ca: 460,
    volume: 128,
    conversion: 2.5,
    desktop: 273,
    mobile: 190,
  },
  {
    mois: "Mai",
    ca: 590,
    volume: 156,
    conversion: 3.1,
    desktop: 209,
    mobile: 130,
  },
  {
    mois: "Juin",
    ca: 640,
    volume: 171,
    conversion: 3.4,
    desktop: 314,
    mobile: 140,
  },
];

const regionRows: ChartRow[] = [
  { region: "Île-de-France", ventes: 820 },
  { region: "Auvergne-Rhône-Alpes", ventes: 540 },
  { region: "Nouvelle-Aquitaine", ventes: 310 },
  { region: "Occitanie", ventes: 280 },
  { region: "Provence-Alpes-Côte d'Azur", ventes: 250 },
];

const mixRows: ChartRow[] = [
  { categorie: "Soin", part: 38 },
  { categorie: "Maquillage", part: 27 },
  { categorie: "Parfum", part: 21 },
  { categorie: "Accessoires", part: 14 },
];

function spec(input: Parameters<typeof chartSpecSchema.parse>[0]): ChartSpec {
  return chartSpecSchema.parse(input);
}

const lineSpec = spec({
  version: 1,
  title: "Chiffre d'affaires mensuel",
  description: "Évolution du CA et du volume sur six mois.",
  chart: "line",
  xAxis: { dataKey: "mois", label: "Mois" },
  yAxis: { type: "number", label: "Valeur" },
  series: [
    { dataKey: "ca", name: "Chiffre d'affaires" },
    { dataKey: "volume", name: "Volume" },
  ],
  options: { height: 320 },
});

const barSpec = spec({
  version: 1,
  title: "Ventes par région",
  description: "Répartition des ventes sur les principales régions.",
  chart: "bar",
  xAxis: { dataKey: "region" },
  yAxis: { type: "number", label: "Ventes" },
  series: [{ dataKey: "ventes", name: "Ventes", type: "bar" }],
  options: { height: 320 },
});

const areaSpec = spec({
  version: 1,
  title: "Trafic desktop et mobile",
  description: "Visites cumulées, empilées par canal.",
  chart: "area",
  xAxis: { dataKey: "mois" },
  yAxis: { type: "number" },
  series: [
    {
      dataKey: "desktop",
      name: "Desktop",
      type: "area",
      stackId: "trafic",
      showDots: false,
    },
    {
      dataKey: "mobile",
      name: "Mobile",
      type: "area",
      stackId: "trafic",
      showDots: false,
    },
  ],
  options: { height: 320 },
});

const composedSpec = spec({
  version: 1,
  title: "CA et taux de conversion",
  description: "Barres pour le chiffre d'affaires, courbe pour la conversion.",
  chart: "composed",
  xAxis: { dataKey: "mois" },
  yAxis: { type: "number" },
  series: [
    {
      dataKey: "ca",
      name: "Chiffre d'affaires",
      type: "bar",
      yAxisId: "left",
    },
    {
      dataKey: "conversion",
      name: "Conversion %",
      type: "line",
      yAxisId: "right",
      showDots: true,
    },
  ],
  options: { height: 320 },
});

const pieSpec = spec({
  version: 1,
  title: "Mix par catégorie",
  description: "Part de chaque univers dans le chiffre d'affaires.",
  chart: "pie",
  xAxis: { dataKey: "categorie" },
  series: [{ dataKey: "part", name: "Part" }],
  options: { height: 320, showGrid: false },
});

function Page() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl">Exemples de graphiques</h1>
        <p className="text-sm text-muted-foreground">
          Chaque carte est construite à partir d&apos;un ChartSpec et du même
          composant Chart.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <Chart chartSpec={lineSpec} rows={monthlyRows} />
        <Chart chartSpec={barSpec} rows={regionRows} />
        <Chart chartSpec={areaSpec} rows={monthlyRows} />
        <Chart chartSpec={composedSpec} rows={monthlyRows} />
        <Chart chartSpec={pieSpec} rows={mixRows} />
      </div>
    </main>
  );
}
