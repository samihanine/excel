import { useQuery } from "@tanstack/react-query";
import { runDax } from "@/lib/dax";

export const daxQueryKey = (datasetName: string, dax: string) =>
  ["dax", datasetName, dax] as const;

/** Exécute (et met en cache) une requête DAX pour un visuel. */
export function useDaxQuery(datasetName: string, dax: string) {
  return useQuery({
    queryKey: daxQueryKey(datasetName, dax),
    queryFn: () => runDax({ datasetName, dax }),
    staleTime: Infinity,
    retry: false,
  });
}
