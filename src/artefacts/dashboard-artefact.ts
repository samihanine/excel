import { createArtefact } from "@/lib/create-artefact";
import { dashboardSchema } from "@/schemas/dashboard-schema";

export const dashboardArtefact = createArtefact({
  name: "dashboard",
  description: "A dashboard artefact",
  prompt: "A dashboard artefact",
  schema: dashboardSchema,
});
