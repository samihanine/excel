import { z } from "zod";

export const excelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
    }),
  ),
});

export type Excel = z.infer<typeof excelSchema>;
