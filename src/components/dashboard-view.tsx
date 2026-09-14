import { VisualCard } from "@/components/visual-card";
import type { VisualMention } from "@/components/visual-card";
import type { Dashboard } from "@/artefacts/dashboard-artefact";

export const DashboardView = ({
  artefactId,
  dashboard,
  datasetName,
  onCite,
  onChange,
}: {
  artefactId: string;
  dashboard: Dashboard;
  datasetName: string;
  onCite: (mention: VisualMention) => void;
  onChange: (next: Dashboard) => void;
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
      {dashboard.visuals.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Ce dashboard est vide : demande à l'agent d'y ajouter des visuels.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {dashboard.visuals.map((visual) => (
            <VisualCard
              key={visual.id}
              visual={visual}
              artefactId={artefactId}
              datasetName={datasetName}
              onCite={onCite}
              onDelete={() =>
                onChange({
                  ...dashboard,
                  visuals: dashboard.visuals.filter(
                    (item) => item.id !== visual.id,
                  ),
                })
              }
              onSaveDax={(daxQuery) =>
                onChange({
                  ...dashboard,
                  visuals: dashboard.visuals.map((item) =>
                    item.id === visual.id ? { ...item, daxQuery } : item,
                  ),
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
