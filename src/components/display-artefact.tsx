import type { ChartSpec, VisualSpec } from "@/schemas/dashboard-schema";
import { Chart } from "./chart";
import { DaxChart } from "./dax-chart";

export const DisplayArtefact = ({
  artefactId,
  artefactJson,
}: {
  artefactId: string;
  artefactJson: string;
}) => {
  const artefact = JSON.parse(artefactJson) as any;

  switch (artefactId) {
    case "dashboard":
      const visuals = artefact.visuals as VisualSpec[];

      return (
        <div>
          {visuals.map((visual) => {
            return (
              <div key={visual.id}>
                <DaxChart
                  daxQuery={visual.daxQuery}
                  chartSpec={visual.chartSpec}
                />
              </div>
            );
          })}
        </div>
      );
    default:
      return <div>Unknown artefact</div>;
  }
};
