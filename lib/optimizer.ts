import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { META_PROMPT } from "./metaPrompt";

const MODEL = "gemini-3.8-flash";

/** Nombre canónico primero; GEMINI_API_KEY y GOOGLE_API_KEY como alternativas. */
function readApiKey(): string | undefined {
  const candidates = [
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
  ];
  return candidates.find((value) => value && value.trim())?.trim();
}

/** Extrae los campos útiles de un error del AI SDK (nunca incluye la clave). */
export function describeError(error: unknown) {
  const e = error as Record<string, unknown> | null;
  return {
    text: error instanceof Error ? error.message : String(error),
    name: e?.name,
    message: e?.message,
    statusCode: e?.statusCode,
    url: e?.url,
    responseBody: e?.responseBody,
    isRetryable: e?.isRetryable,
    cause: e?.cause instanceof Error ? e.cause.message : e?.cause,
  };
}

/**
 * Optimiza una consigna con el AI SDK de Vercel (Google gemini-3.8-flash).
 * Lee la clave de process.env solo en servidor (.env.local en local,
 * Environment Variables en Vercel).
 */
export async function optimizePrompt(prompt: string): Promise<string> {
  const key = readApiKey();
  if (!key) {
    console.error(
      "[optimizer] Falta la clave de Gemini: define GOOGLE_GENERATIVE_AI_API_KEY " +
        "(.env.local en local, Settings → Environment Variables en Vercel) y vuelve a desplegar.",
    );
    throw new Error(
      "Falta la variable de entorno GOOGLE_GENERATIVE_AI_API_KEY (o GEMINI_API_KEY) en el servidor",
    );
  }

  const google = createGoogleGenerativeAI({ apiKey: key });

  try {
    const { text } = await generateText({
      model: google(MODEL),
      system: META_PROMPT,
      prompt,
    });
    return text.trim();
  } catch (error) {
    console.error(
      `[optimizer] Falló la llamada a ${MODEL}:`,
      describeError(error),
    );
    throw error;
  }
}
