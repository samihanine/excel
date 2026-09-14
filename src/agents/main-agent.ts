import { createAgent } from "@/lib/create-agent";
import { runDaxTool } from "@/tools/run-dax-tool";
import { dashboardArtefact } from "@/artefacts/dashboard-artefact";

export const daxAgent = createAgent({
  name: "dax-agent",
  description: "An agent that can run DAX queries",
  prompt: "You are a helpful assistant that can run DAX queries",
  tools: [runDaxTool],
  model: "gpt-5.6-luna",
  artefacts: [dashboardArtefact],
});
