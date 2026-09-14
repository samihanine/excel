import type { z } from "zod";

export type Artefact = {
  name: string;
  description: string;
  prompt: string;
  schema: z.ZodSchema;
};

export const createArtefact = (props: Artefact) => {
  return props;
};
