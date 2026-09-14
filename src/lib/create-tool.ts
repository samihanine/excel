import { z } from "zod";

export type Tool<
  TParameters extends z.ZodType = z.ZodType,
  TResponse extends z.ZodType = z.ZodType,
> = {
  name: string;
  description: string;
  prompt: string;
  parameters: TParameters;
  response: TResponse;
  function(props: z.infer<TParameters>): Promise<z.infer<TResponse>>;
};

export const createTool = <
  TParameters extends z.ZodType,
  TResponse extends z.ZodType,
>(
  props: Tool<TParameters, TResponse>,
) => props;
