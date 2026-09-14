import { z } from "zod";

export const conversationParamsSchema = z.object({
  id: z.string().trim().min(1, "Conversation ID is required"),
});

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const createMessageSchema = z.object({
  textContent: z.string().trim().min(1).max(10_000),
});

export const uploadDocumentSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "File cannot be empty")
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      "File cannot exceed 10 MB",
    ),
});

export function validationError(error: z.ZodError) {
  return Response.json(
    {
      error: "Validation failed",
      issues: error.issues,
    },
    { status: 400 },
  );
}
