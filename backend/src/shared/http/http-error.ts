/**
 * Error de dominio con código HTTP. Lo lanzan los servicios y lo traduce `errorHandler`;
 * así ningún servicio conoce `Response`.
 */

/** Error que el manejador global convierte en una respuesta con `status` y `message`. */
export class HttpError extends Error {
  readonly status: number;

  /**
   * Crea el error con su código HTTP y su mensaje.
   *
   * @param status - Código HTTP de la respuesta.
   * @param message - Mensaje legible que viaja al cliente.
   */
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Crea un 404 para un recurso que no existe. */
export const notFound = (what: string): HttpError => new HttpError(404, `${what} no existe`);

/** Crea un 409 para una operación que choca con el estado actual del recurso. */
export const conflict = (message: string): HttpError => new HttpError(409, message);
