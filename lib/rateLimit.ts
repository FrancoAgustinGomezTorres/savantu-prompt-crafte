// Limitador en memoria (ventana deslizante). Suficiente para una sola instancia;
// con varias instancias o serverless hay que pasar a un almacén compartido (Redis/Upstash).

const MAX_KEYS = 10_000;

const globalStore = globalThis as unknown as { __savantuRateLimit?: Map<string, number[]> };
// Se guarda en globalThis para sobrevivir a la recarga de módulos en desarrollo.
const store = (globalStore.__savantuRateLimit ??= new Map<string, number[]>());

export type RateResult = { ok: true } | { ok: false; retryAfterSec: number };

export function rateLimit(name: string, ip: string, max: number, windowMs: number): RateResult {
  const now = Date.now();
  const key = `${name}:${ip}`;
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= max) {
    store.set(key, hits);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) };
  }

  hits.push(now);
  store.set(key, hits);

  // Evita crecimiento sin límite: purga claves caducadas y, si aún sobran, las más antiguas.
  if (store.size > MAX_KEYS) {
    for (const [k, v] of store) {
      if (v.every((t) => now - t >= windowMs)) store.delete(k);
    }
    for (const k of store.keys()) {
      if (store.size <= MAX_KEYS) break;
      store.delete(k);
    }
  }
  return { ok: true };
}

/**
 * IP del cliente. x-forwarded-for / x-real-ip solo son fiables detrás de un proxy
 * de confianza (Vercel, Nginx...) que los sobrescriba; expuesta directamente, un
 * atacante podría falsearlos. Sin cabecera, todos comparten el cubo "unknown".
 */
export function getClientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || "unknown";
}
