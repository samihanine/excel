import type { z } from "zod";

/** Type d'artefact que l'agent peut créer (le `name` sert de `type` dans le stockage). */
export type Artefact<TSchema extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  prompt: string;
  schema: TSchema;
};

export const createArtefact = <TSchema extends z.ZodType>(
  props: Artefact<TSchema>,
) => props;

export function findArtefact(artefacts: Artefact[], type: string) {
  const artefact = artefacts.find((candidate) => candidate.name === type);
  if (!artefact) {
    throw new Error(
      `Type d'artefact inconnu : « ${type} ». Types disponibles : ${artefacts.map((candidate) => candidate.name).join(", ")}.`,
    );
  }
  return artefact;
}
