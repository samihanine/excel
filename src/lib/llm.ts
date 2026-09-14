import OpenAI from "openai";
import type { LlmMessage } from "@/schemas/conversation-schema";
import { store } from "./storage";

export type Model = "gpt-5.6-luna" | "gpt-5.6-terra";

function client(apiKey = store.aiToken.read()) {
  if (!apiKey) throw new Error("Jeton IA manquant.");
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

/** Vérifie le jeton IA par un appel léger ; lève une erreur s'il est invalide. */
export async function checkAiToken(apiKey = store.aiToken.read()) {
  await client(apiKey).models.list();
  return true;
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
