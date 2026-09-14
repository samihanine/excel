import { z } from "zod";

export const excelContractSchema = z.object({
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
