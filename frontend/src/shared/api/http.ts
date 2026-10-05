/**
 * Cliente HTTP mínimo: `fetch` con JSON y validación Zod de la respuesta.
 */
import type { z } from "zod";

/** Error de la API con el código HTTP y el mensaje que devolvió el backend. */
export class ApiError extends Error {
  readonly status: number;

  /**
   * Crea el error con el código HTTP y el mensaje del backend.
   *
   * @param status - Código HTTP de la respuesta.
   * @param message - Mensaje del backend o el texto de estado.
   */
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Extrae `message` del cuerpo de error; si no hay, usa el texto de estado HTTP. */
const errorMessage = async (response: Response): Promise<string> => {
  const body: unknown = await response.json().catch(() => undefined);
  return typeof body === "object" && body !== null && "message" in body ? String(body.message) : response.statusText;
};

/**
 * Hace la petición y valida la respuesta con `schema`.
 *
 * @param body - Si se indica, se envía como JSON con método POST.
 * @throws ApiError si la respuesta no es 2xx.
 * @throws ZodError si la respuesta no cumple el esquema.
 */
export const requestJson = async <T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> => {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  return schema.parse(await response.json());
};
