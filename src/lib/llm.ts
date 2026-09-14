import OpenAI from "openai";
import type { LlmMessage } from "@/schemas/conversation-schema";
import { store } from "./storage";

export type Model = "gpt-5.6-luna" | "gpt-5.6-terra";

function client(apiKey = store.aiToken.read()) {
  if (!apiKey) throw new Error("Jeton IA manquant.");
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

/**
 * Vérifie le jeton IA. Toujours renvoyer une valeur : TanStack Query
 * traite `undefined` comme une erreur (« data is undefined »).
 * `GET /models` n'existe pas chez tous les fournisseurs : on bascule
 * alors sur la création d'une conversation vide.
 */
export async function checkAiToken(apiKey = store.aiToken.read()) {
  const openai = client(apiKey);
  try {
    await openai.models.list();
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? error.status
        : undefined;
    if (status === 401 || status === 403) throw error;
    await openai.conversations.create();
  }
  return { ok: true as const };
}

/** Envoie l'historique complet au modèle et renvoie le texte de sa réponse (JSON). */
export const complete = async ({
  model,
  messages,
}: {
  model: Model;
  messages: LlmMessage[];
}): Promise<string> => {
  const completion = await client().chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages,
  });

  return completion.choices[0]?.message.content ?? "";
};
