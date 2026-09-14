import type { ChartSpec } from "@/schemas/dashboard-schema";
import { Chart } from "./chart";
import { useMutation } from "@tanstack/react-query";
import { runDax } from "@/lib/dax";

export const DaxChart = ({
  daxQuery,
  chartSpec,
}: {
  daxQuery: string;
  chartSpec: ChartSpec;
}) => {
  const runDaxMutation = useMutation({
    mutationFn: async () => {
      return await runDax({ dax: daxQuery });
    },
  });
  return (
    <Chart
      chartSpec={chartSpec}
      rows={(runDaxMutation.data?.rows as any) ?? []}
    />
  );
};
