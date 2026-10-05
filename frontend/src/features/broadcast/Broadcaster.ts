/**
 * Emisor WebRTC (las gafas): una `RTCPeerConnection` por espectador en malla P2P.
 * Escala a unos pocos espectadores; para decenas haría falta un SFU que reenvíe un solo envío.
 * No depende de React: el hook `useBroadcaster` solo lo conecta al ciclo de vida del componente.
 */
import { SignalingClient } from "../../shared/signaling/SignalingClient.ts";
import type { ServerMessage } from "../../shared/signaling/messages.ts";
import { RTC_CONFIG } from "../../shared/webrtc/rtc-config.ts";

/** Emite `stream` a cada espectador que entra en la sala. */
export class Broadcaster {
  readonly #stream: MediaStream;
  readonly #peers = new Map<string, RTCPeerConnection>();
  readonly #signaling: SignalingClient;
  readonly #onViewers: (count: number) => void;

  /**
   * Abre la señalización como emisor de la sala y espera a los espectadores.
   *
   * @param stream - Pista de vídeo del canvas que se envía.
   * @param roomId - Sala de señalización (id de la sesión de formación).
   * @param onViewers - Recibe el número de espectadores cada vez que cambia.
   * @param onRejected - Se invoca si la sala ya tiene otro emisor.
   */
  constructor(stream: MediaStream, roomId: string, onViewers: (count: number) => void, onRejected: (reason: string) => void) {
    this.#stream = stream;
    this.#onViewers = onViewers;
    this.#signaling = new SignalingClient(roomId, "broadcaster", {
      onMessage: (message) => void this.#handle(message),
      onRejected,
    });
  }

  /** Cierra todas las conexiones y la señalización. */
  stop(): void {
    for (const viewerId of [...this.#peers.keys()]) this.#drop(viewerId);
    this.#signaling.close();
  }

  /** Reacciona a cada mensaje del servidor. */
  async #handle(message: ServerMessage): Promise<void> {
    if (message.type === "viewer-joined") return this.#offerTo(message.viewerId);
    if (message.type === "viewer-left") return this.#drop(message.viewerId);
    const peer = "from" in message ? this.#peers.get(message.from) : undefined;
    if (message.type === "answer") await peer?.setRemoteDescription({ type: "answer", sdp: message.sdp });
    if (message.type === "candidate") await peer?.addIceCandidate(message.candidate);
  }

  /** Crea la conexión para un espectador, añade la pista y le envía la oferta. */
  async #offerTo(viewerId: string): Promise<void> {
    this.#drop(viewerId);
    const peer = new RTCPeerConnection(RTC_CONFIG);
    this.#peers.set(viewerId, peer);
    this.#onViewers(this.#peers.size);
    for (const track of this.#stream.getTracks()) peer.addTrack(track, this.#stream);
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) this.#signaling.send({ type: "candidate", to: viewerId, candidate: candidate.toJSON() });
    };
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    this.#signaling.send({ type: "offer", to: viewerId, sdp: offer.sdp ?? "" });
  }

  /** Cierra y olvida la conexión de un espectador. */
  #drop(viewerId: string): void {
    const peer = this.#peers.get(viewerId);
    if (!peer) return;
    peer.close();
    this.#peers.delete(viewerId);
    this.#onViewers(this.#peers.size);
  }
}
