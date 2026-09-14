import { z } from "zod";

export const datasetSchema = z.object({
  id: z.string(),
  title: z.string(),
  context: z.string(),
  examples: z.array(z.string()),
  semanticModelName: z.string(),
});

export type Dataset = z.infer<typeof datasetSchema>;
