import type { Agent } from "@/lib/create-agent";
import { mainAgent } from "./main-agent";

/** Registre des agents : ajouter ici un nouvel agent suffit pour le rendre disponible. */
export const agents: Agent[] = [mainAgent];

export const defaultAgent = mainAgent;

export function getAgent(name: string) {
  const agent = agents.find((candidate) => candidate.name === name);
  if (!agent) throw new Error(`Agent « ${name} » introuvable.`);
  return agent;
}
