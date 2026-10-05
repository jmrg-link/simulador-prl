/**
 * Adaptador WebSocket de la señalización en `/ws/signaling/:roomId?role=broadcaster|viewer`.
 * Traduce sockets a `Peer`, valida cada mensaje entrante y corta conexiones muertas con ping/pong.
 */
import { randomUUID } from "node:crypto";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import { z } from "zod";
import type { UpgradeRoute } from "../../shared/ws/upgrade-router.ts";
import type { Peer } from "./room.ts";
import { clientMessageSchema, type ServerMessage } from "./signaling.messages.ts";
import type { SignalingService } from "./signaling.service.ts";

const roleSchema = z.enum(["broadcaster", "viewer"]);
const HEARTBEAT_MS = 30_000;
const MAX_PAYLOAD_BYTES = 64 * 1024;
const CLOSE_POLICY = 1008;
const CLOSE_ROOM_TAKEN = 4409;

/** Socket con la marca de vida que actualiza cada `pong`. */
type LiveSocket = WebSocket & { isAlive?: boolean };

/** Crea un `Peer` cuyo `send` serializa a JSON solo si el socket sigue abierto. */
const toPeer = (socket: WebSocket, role: Peer["role"]): Peer => ({
  id: randomUUID(),
  role,
  send: (message: ServerMessage) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  },
});

/** Parsea y valida un mensaje crudo; `undefined` si no es JSON o no cumple el protocolo. */
const parseMessage = (data: RawData) => {
  try {
    const result = clientMessageSchema.safeParse(JSON.parse(data.toString()));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
};

/** Termina los sockets que no contestaron al último ping y vuelve a sondear al resto. */
const sweep = (server: WebSocketServer): void => {
  for (const socket of server.clients as Set<LiveSocket>) {
    if (socket.isAlive === false) socket.terminate();
    else {
      socket.isAlive = false;
      socket.ping();
    }
  }
};

/** Gateway de señalización con su ruta de upgrade y su parada. */
export interface SignalingGateway {
  route: UpgradeRoute;
  close(): void;
}

/** Conecta un socket ya aceptado a la sala con el papel pedido. */
const bindSocket = (service: SignalingService, socket: LiveSocket, roomId: string, role: Peer["role"]): void => {
  const peer = toPeer(socket, role);
  if (!service.join(roomId, peer)) {
    socket.close(CLOSE_ROOM_TAKEN, "La sala ya tiene emisor");
    return;
  }
  socket.isAlive = true;
  socket.on("pong", () => (socket.isAlive = true));
  socket.on("message", (data) => {
    const message = parseMessage(data);
    if (message) service.relay(roomId, peer, message);
    else peer.send({ type: "error", message: "Mensaje inválido" });
  });
  socket.on("close", () => service.leave(roomId, peer));
};

/** Crea el gateway sobre el servicio de señalización. */
export const createSignalingGateway = (service: SignalingService): SignalingGateway => {
  const server = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });
  const heartbeat = setInterval(() => sweep(server), HEARTBEAT_MS);
  return {
    route: {
      prefix: "/ws/signaling/",
      handle: (req, socket, head, roomId, url) => {
        server.handleUpgrade(req, socket, head, (ws) => {
          const role = roleSchema.safeParse(url.searchParams.get("role"));
          if (role.success) bindSocket(service, ws, roomId, role.data);
          else ws.close(CLOSE_POLICY, "role debe ser broadcaster o viewer");
        });
      },
    },
    close: () => {
      clearInterval(heartbeat);
      for (const client of server.clients) client.terminate();
      server.close();
    },
  };
};
