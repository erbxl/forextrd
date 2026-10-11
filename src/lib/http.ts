import { z } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

const buckets = new Map<string, { count: number; expiresAt: number }>();
const WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 16_384;

function localHostname(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

export function assertLocalHost(request: Request): URL {
  const host = request.headers.get("host");
  const url = new URL(request.url);
  if (!host || host.toLowerCase() !== url.host.toLowerCase() || !localHostname(url.hostname)) {
    throw new HttpError(403, "Esta instalación solo acepta solicitudes locales.");
  }
  return url;
}

export function guardRequest(request: Request, action: string, limit = 60, now = Date.now()) {
  const url = assertLocalHost(request);
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin !== url.origin || request.headers.get("sec-fetch-site") === "cross-site") {
      throw new HttpError(403, "El origen de la solicitud no está autorizado.");
    }
  }
  // One trusted local user, so no spoofable forwarding/IP header is used.
  const previous = buckets.get(action);
  const bucket = previous && previous.expiresAt > now
    ? previous : { count: 0, expiresAt: now + WINDOW_MS };
  if (bucket.count >= limit) throw new HttpError(429, "Demasiadas solicitudes. Espera un minuto e inténtalo de nuevo.");
  bucket.count += 1;
  buckets.set(action, bucket);
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const mediaType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json") throw new HttpError(415, "Envía los datos en formato JSON.");
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(declaredSize) || declaredSize < 0 || declaredSize > MAX_BODY_BYTES) {
    throw new HttpError(413, "La solicitud es demasiado grande.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Faltan los datos de la solicitud.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new HttpError(413, "La solicitud es demasiado grande.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
  } catch {
    throw new HttpError(400, "El contenido JSON no es válido.");
  }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new HttpError(400, "Revisa los datos introducidos y vuelve a intentarlo.");
  return result.data;
}

export async function apiResponse(action: () => Promise<unknown>) {
  try {
    return Response.json(await action(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, {
        status: error.status,
        headers: { "Cache-Control": "no-store", ...(error.status === 429 ? { "Retry-After": "60" } : {}) },
      });
    }
    console.error("Error interno en la API local de la academia.");
    return Response.json({ error: "No se pudo guardar o consultar la información. Comprueba que la base de datos esté inicializada." }, {
      status: 500, headers: { "Cache-Control": "no-store" },
    });
  }
}

export const answersSchema = z.object({
  answers: z.record(z.string().min(1).max(80), z.union([
    z.string().min(1).max(200), z.number().finite().min(-1e12).max(1e12),
  ])).refine((answers) => Object.keys(answers).length > 0 && Object.keys(answers).length <= 100),
}).strict();

export const completionSchema = z.object({ read: z.literal(true) }).strict();
export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(50).regex(/^[^\u0000-\u001f\u007f<>]+$/u),
  weeklyGoal: z.number().int().min(1).max(7),
}).strict();
export const studySchema = z.object({ sessionId: z.string().min(20).max(80).regex(/^[a-z0-9]+$/).optional() }).strict();
