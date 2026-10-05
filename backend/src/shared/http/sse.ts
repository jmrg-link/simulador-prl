/**
 * Server-Sent Events sobre una respuesta de Express. Lo usan los módulos que empujan cambios
 * de estado al navegador en lugar de que este haga polling.
 */
import type { Request, Response } from "express";

/** Canal SSE abierto sobre una respuesta HTTP. */
export interface SseChannel {
  /** Envía un evento con `data` serializado como JSON. */
  send(data: unknown): void;
  /** Cierra la respuesta desde el servidor. */
  close(): void;
}

const HEARTBEAT_MS = 15_000;

/**
 * Abre un canal SSE: cabeceras sin caché ni buffering de proxy y un comentario de latido
 * periódico para que nginx o un balanceador no corten la conexión por inactividad.
 *
 * @param onClose - Se invoca una vez cuando el cliente se desconecta o se llama a `close()`.
 */
export const openSse = (req: Request, res: Response, onClose: () => void): SseChannel => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);
  req.once("close", () => {
    clearInterval(heartbeat);
    onClose();
  });
  return {
    send: (data) => res.write(`data: ${JSON.stringify(data)}\n\n`),
    close: () => res.end(),
  };
};
