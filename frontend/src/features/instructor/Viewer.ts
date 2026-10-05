/**
 * Espectador WebRTC (el instructor): contesta la oferta del emisor y entrega el `MediaStream`
 * recibido. Si el emisor se va y vuelve, recibirá una oferta nueva y reconecta solo.
 */
import { SignalingClient } from "../../shared/signaling/SignalingClient.ts";
import type { ServerMessage } from "../../shared/signaling/messages.ts";
import { RTC_CONFIG } from "../../shared/webrtc/rtc-config.ts";

/** Estado de la conexión del espectador. */
export type ViewerStatus = "conectando" | "esperando-emisor" | "negociando" | "en-directo";

/** Oyentes del espectador. */
export interface ViewerHandlers {
  onStream(stream: MediaStream | null): void;
  onStatus(status: ViewerStatus): void;
}

/** Recibe la emisión de una sala. */
export class Viewer {
  readonly #signaling: SignalingClient;
  readonly #handlers: ViewerHandlers;
  #peer: RTCPeerConnection | undefined;

  /**
   * Abre la señalización como espectador de la sala.
   *
   * @param roomId - Sala de señalización (id de la sesión de formación).
   * @param handlers - Oyentes de stream y estado.
   */
  constructor(roomId: string, handlers: ViewerHandlers) {
    this.#handlers = handlers;
    handlers.onStatus("conectando");
    this.#signaling = new SignalingClient(roomId, "viewer", { onMessage: (message) => void this.#handle(message) });
  }

  /** Cierra la conexión y la señalización. */
  stop(): void {
    this.#reset();
    this.#signaling.close();
  }

  /** Reacciona a cada mensaje del servidor. */
  async #handle(message: ServerMessage): Promise<void> {
    if (message.type === "welcome") this.#handlers.onStatus(message.broadcasterOnline ? "negociando" : "esperando-emisor");
    if (message.type === "broadcaster-joined") this.#handlers.onStatus("negociando");
    if (message.type === "broadcaster-left") {
      this.#reset();
      this.#handlers.onStatus("esperando-emisor");
    }
    if (message.type === "offer") await this.#answer(message.sdp);
    if (message.type === "candidate") await this.#peer?.addIceCandidate(message.candidate);
  }

  /** Crea una conexión nueva para la oferta recibida y devuelve la respuesta. */
  async #answer(sdp: string): Promise<void> {
    this.#reset();
    const peer = new RTCPeerConnection(RTC_CONFIG);
    this.#peer = peer;
    peer.ontrack = ({ streams }) => {
      this.#handlers.onStream(streams[0] ?? null);
      this.#handlers.onStatus("en-directo");
    };
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) this.#signaling.send({ type: "candidate", candidate: candidate.toJSON() });
    };
    await peer.setRemoteDescription({ type: "offer", sdp });
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    this.#signaling.send({ type: "answer", sdp: answer.sdp ?? "" });
  }

  /** Cierra la conexión actual y avisa de que ya no hay stream. */
  #reset(): void {
    this.#peer?.close();
    this.#peer = undefined;
    this.#handlers.onStream(null);
  }
}
