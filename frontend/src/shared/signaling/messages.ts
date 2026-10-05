/**
 * Protocolo de señalización visto desde el cliente. Es el espejo de
 * `backend/src/modules/signaling/signaling.messages.ts`: los mensajes del servidor se validan
 * al llegar y los del cliente se tipan al salir.
 */
import { z } from "zod";

const candidateSchema = z.object({
  candidate: z.string(),
  sdpMid: z.string().nullable().optional(),
  sdpMLineIndex: z.number().nullable().optional(),
  usernameFragment: z.string().nullable().optional(),
});

/** Mensajes que emite el servidor. */
export const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("welcome"), peerId: z.string(), role: z.enum(["broadcaster", "viewer"]), broadcasterOnline: z.boolean() }),
  z.object({ type: z.literal("viewer-joined"), viewerId: z.string() }),
  z.object({ type: z.literal("viewer-left"), viewerId: z.string() }),
  z.object({ type: z.literal("broadcaster-joined") }),
  z.object({ type: z.literal("broadcaster-left") }),
  z.object({ type: z.literal("offer"), from: z.string(), sdp: z.string() }),
  z.object({ type: z.literal("answer"), from: z.string(), sdp: z.string() }),
  z.object({ type: z.literal("candidate"), from: z.string(), candidate: candidateSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

/** Mensaje del servidor ya validado. */
export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** Mensajes que puede enviar el cliente. */
export type ClientMessage =
  | { type: "offer"; to: string; sdp: string }
  | { type: "answer"; sdp: string }
  | { type: "candidate"; to?: string; candidate: RTCIceCandidateInit };

/** Papel en la sala. */
export type Role = "broadcaster" | "viewer";
