import type { z } from "zod";
import type { Dataset } from "@/schemas/dataset-schema";
import type { Artefact } from "./create-artefact";

/** Contexte fourni à chaque outil lors de son exécution. */
export type ToolContext = {
  conversationId: string;
  dataset: Dataset;
  artefacts: Artefact[];
};

export type Tool<
  TParameters extends z.ZodType = z.ZodType,
  TResponse extends z.ZodType = z.ZodType,
> = {
  name: string;
  description: string;
  prompt: string;
  parameters: TParameters;
  response: TResponse;
  function: (
    props: z.infer<TParameters>,
    context: ToolContext,
  ) => Promise<z.infer<TResponse>>;
};

export const createTool = <
  TParameters extends z.ZodType,
  TResponse extends z.ZodType,
>(
  props: Tool<TParameters, TResponse>,
) => props;
