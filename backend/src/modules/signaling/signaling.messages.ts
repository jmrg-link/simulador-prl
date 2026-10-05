/**
 * Protocolo de señalización WebRTC. Los mensajes del cliente se validan con Zod al entrar;
 * los del servidor se tipan para que el gateway no pueda emitir uno mal formado.
 *
 * Flujo: el emisor (las gafas) siempre hace la oferta, una por espectador; el espectador
 * solo contesta. Así nunca hay ofertas cruzadas.
 */
import { z } from "zod";

const iceCandidate = z.object({
  candidate: z.string(),
  sdpMid: z.string().nullable().optional(),
  sdpMLineIndex: z.number().int().nullable().optional(),
  usernameFragment: z.string().nullable().optional(),
});

/** Candidato ICE serializado tal como lo produce `RTCIceCandidate.toJSON()`. */
export type IceCandidate = z.infer<typeof iceCandidate>;

/** Mensajes que puede enviar un cliente. `to` identifica al espectador destino del emisor. */
export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("offer"), to: z.string(), sdp: z.string().max(64_000) }),
  z.object({ type: z.literal("answer"), sdp: z.string().max(64_000) }),
  z.object({ type: z.literal("candidate"), to: z.string().optional(), candidate: iceCandidate }),
]);

/** Mensaje de cliente ya validado. */
export type ClientMessage = z.infer<typeof clientMessageSchema>;

/** Papel de un participante en la sala. */
export type Role = "broadcaster" | "viewer";

/** Mensajes que emite el servidor. */
export type ServerMessage =
  | { type: "welcome"; peerId: string; role: Role; broadcasterOnline: boolean }
  | { type: "viewer-joined"; viewerId: string }
  | { type: "viewer-left"; viewerId: string }
  | { type: "broadcaster-joined" }
  | { type: "broadcaster-left" }
  | { type: "offer"; from: string; sdp: string }
  | { type: "answer"; from: string; sdp: string }
  | { type: "candidate"; from: string; candidate: IceCandidate }
  | { type: "error"; message: string };
