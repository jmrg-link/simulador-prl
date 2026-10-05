/**
 * Adaptador WebSocket de la ingesta en `/ws/ingest/:streamId`. Recibe los trozos binarios de
 * `MediaRecorder` y los vuelca en el stdin del FFmpeg de ingesta. Cerrar el socket termina la ingesta.
 *
 * Protocolo: el servidor manda `{"type":"ready"}` cuando FFmpeg ya escucha; el cliente no debe
 * enviar nada antes, porque el primer trozo lleva la cabecera del contenedor y no puede perderse.
 */
import { WebSocketServer, type WebSocket } from "ws";
import { HttpError } from "../../shared/http/http-error.ts";
import type { UpgradeRoute } from "../../shared/ws/upgrade-router.ts";
import type { IngestSink, LiveStreamsService } from "./live-streams.service.ts";

const MAX_CHUNK_BYTES = 8 * 1024 * 1024;
const CLOSE_INTERNAL = 1011;
const CLOSE_APP_OFFSET = 4000;

/** Gateway de ingesta con su ruta de upgrade y su parada. */
export interface IngestGateway {
  route: UpgradeRoute;
  close(): void;
}

/** Conecta el socket a la ingesta abierta: binario a stdin, cierre a fin de entrada. */
const pipeSocket = (socket: WebSocket, sink: IngestSink): void => {
  if (socket.readyState !== socket.OPEN) return sink.end();
  socket.on("message", (data, isBinary) => {
    if (isBinary) sink.write(Buffer.isBuffer(data) ? data : Buffer.concat(data as Buffer[]));
  });
  socket.on("close", () => sink.end());
  socket.send(JSON.stringify({ type: "ready" }));
};

/** Cierra el socket con un código 4xxx que refleja el HTTP del error, o 1011 si es inesperado. */
const closeWithError = (socket: WebSocket, error: unknown): void => {
  if (error instanceof HttpError) socket.close(CLOSE_APP_OFFSET + error.status, error.message);
  else socket.close(CLOSE_INTERNAL, "Error interno");
};

/** Crea el gateway sobre el servicio de emisiones. */
export const createIngestGateway = (service: LiveStreamsService): IngestGateway => {
  const server = new WebSocketServer({ noServer: true, maxPayload: MAX_CHUNK_BYTES });
  return {
    route: {
      prefix: "/ws/ingest/",
      handle: (req, socket, head, streamId) => {
        server.handleUpgrade(req, socket, head, (ws) => {
          service.openIngest(streamId).then(
            (sink) => pipeSocket(ws, sink),
            (error: unknown) => closeWithError(ws, error),
          );
        });
      },
    },
    close: () => {
      for (const client of server.clients) client.terminate();
      server.close();
    },
  };
};
