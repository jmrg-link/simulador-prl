/**
 * Composición del módulo de señalización WebRTC: mediador y gateway WebSocket.
 * No toca la base: una sala es el id de la sesión de formación y vive solo en memoria.
 */
import { createSignalingGateway, type SignalingGateway } from "./signaling.gateway.ts";
import { SignalingService } from "./signaling.service.ts";

/** Lo que el módulo expone a la aplicación. */
export interface SignalingModule {
  gateway: SignalingGateway;
}

/** Crea el módulo. */
export const createSignalingModule = (): SignalingModule => ({
  gateway: createSignalingGateway(new SignalingService()),
});
