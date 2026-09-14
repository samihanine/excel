import { DaxChart } from "@/components/dax-chart";
import type { Dashboard } from "@/artefacts/dashboard-artefact";

export const DashboardView = ({
  dashboard,
  datasetName,
}: {
  dashboard: Dashboard;
  datasetName: string;
}) => {
  return (
    <div className="flex flex-col gap-4">
      {dashboard.title || dashboard.description ? (
        <div>
          {dashboard.title ? (
            <h2 className="text-lg font-semibold">{dashboard.title}</h2>
          ) : null}
          {dashboard.description ? (
            <p className="text-sm text-muted-foreground">
              {dashboard.description}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {dashboard.visuals.map((visual) => (
          <DaxChart
            key={visual.id}
            datasetName={datasetName}
            daxQuery={visual.daxQuery}
            chartSpec={{
              ...visual.chartSpec,
              title: visual.chartSpec.title ?? visual.title,
              description: visual.chartSpec.description ?? visual.description,
            }}
          />
        ))}
      </div>
    </div>
  );
};
