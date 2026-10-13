import { NextResponse } from "next/server";
import { describeError, optimizePrompt } from "../../../lib/optimizer";
import type { OptimizeResponse } from "../../../lib/types";
import { MAX_JSON_BYTES, MAX_PROMPT_CHARS, OPTIMIZE_LIMIT } from "../../../lib/limits";
import { getClientIp, rateLimit } from "../../../lib/rateLimit";
import { sanitizeText } from "../../../lib/sanitize";

// Serverless de Vercel: Node.js (necesario para el AI SDK), sin caché, y margen para la llamada al LLM.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Mensaje de diagnóstico para el cliente: sin claves ni cuerpos de respuesta completos. */
function diagnosticMessage(error: unknown): string {
  const info = describeError(error);
  const base = typeof info.message === "string" && info.message ? info.message : info.text;
  const status = typeof info.statusCode === "number" ? ` (HTTP ${info.statusCode})` : "";
  return `${base}${status}`.replace(/AIza[\w-]{20,}/g, "[clave oculta]").slice(0, 500);
}

export async function POST(request: Request) {
  try {
    return await handle(request);
  } catch (error) {
    console.error("[OPTIMIZE_API_ERROR]:", error);
    return NextResponse.json(
      { error: `Error interno: ${diagnosticMessage(error)}`, details: diagnosticMessage(error) },
      { status: 500 },
    );
  }
}

async function handle(request: Request) {
  // 1. Rate limit antes de hacer cualquier trabajo (5 peticiones/minuto por IP).
  const rate = rateLimit("optimize", getClientIp(request), OPTIMIZE_LIMIT.max, OPTIMIZE_LIMIT.windowMs);
  if (!rate.ok) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Inténtalo de nuevo en ${rate.retryAfterSec} segundos.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  // 2. Rechazar cuerpos enormes antes de parsearlos.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_JSON_BYTES) {
    return NextResponse.json({ error: "La petición es demasiado grande" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const raw =
    typeof body === "object" && body !== null && "prompt" in body
      ? (body as { prompt: unknown }).prompt
      : undefined;

  if (typeof raw !== "string") {
    return NextResponse.json({ error: "La consigna está vacía" }, { status: 400 });
  }
  if (raw.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `La consigna supera los ${MAX_PROMPT_CHARS} caracteres` },
      { status: 413 },
    );
  }

  // 3. Sanitizar la entrada (el servidor no confía en lo que limpió el cliente).
  const prompt = sanitizeText(raw);
  if (prompt.trim().length === 0) {
    return NextResponse.json({ error: "La consigna está vacía" }, { status: 400 });
  }

  try {
    const optimized = sanitizeText(await optimizePrompt(prompt));
    return NextResponse.json<OptimizeResponse>({ optimized });
  } catch (error) {
    // Diagnóstico temporal: el mensaje real del error va al log y al cuerpo de la respuesta.
    // Cuando se resuelva el 500 en Vercel, volver a un mensaje genérico para el cliente.
    console.error("[OPTIMIZE_API_ERROR]:", error);
    console.error("[OPTIMIZE_API_ERROR] resumen:", describeError(error));
    const message = diagnosticMessage(error);
    return NextResponse.json(
      { error: `No se pudo optimizar la consigna: ${message}`, details: message },
      { status: 500 },
    );
  }
}
