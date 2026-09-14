import { useQuery } from "@tanstack/react-query";
import type { ChartSpec } from "@/schemas/visual-spec-schema";
import { Chart } from "@/components/chart";
import { runDax } from "@/lib/dax";
import { getErrorMessage } from "@/lib/retry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const daxQueryKey = (datasetName: string, dax: string) =>
  ["dax", datasetName, dax] as const;

export const DaxChart = ({
  datasetName,
  daxQuery,
  chartSpec,
}: {
  datasetName: string;
  daxQuery: string;
  chartSpec: ChartSpec;
}) => {
  const query = useQuery({
    queryKey: daxQueryKey(datasetName, daxQuery),
    queryFn: () => runDax({ datasetName, dax: daxQuery }),
    staleTime: Infinity,
    retry: false,
  });

  if (query.isPending) {
    return <Skeleton style={{ height: chartSpec.options.height }} />;
  }

  if (query.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{chartSpec.title ?? "Erreur"}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive">
          {getErrorMessage(query.error)}
        </CardContent>
      </Card>
    );
  }

  return <Chart chartSpec={chartSpec} rows={query.data.rows} />;
};
