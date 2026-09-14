import { createArtefact } from "@/lib/create-artefact";
import { visualSpecSchema } from "@/schemas/visual-spec-schema";
import z from "zod";

export const dashboardArtefact = createArtefact({
  name: "dashboard",
  description: "A dashboard artefact",
  prompt: "A dashboard artefact",
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    visuals: z.array(visualSpecSchema),
  }),
});
