/**
 * Sala de señalización: un emisor como máximo y cualquier número de espectadores.
 * Solo guarda quién está; el reenvío de mensajes lo decide `SignalingService`.
 */
import type { Role, ServerMessage } from "./signaling.messages.ts";

/** Participante conectado. `send` abstrae el transporte para poder probar sin sockets. */
export interface Peer {
  id: string;
  role: Role;
  send(message: ServerMessage): void;
}

/** Estado de una sala de señalización. */
export class Room {
  #broadcaster: Peer | undefined;
  readonly #viewers = new Map<string, Peer>();

  /** Emisor actual, si lo hay. */
  get broadcaster(): Peer | undefined {
    return this.#broadcaster;
  }

  /** Espectadores conectados. */
  get viewers(): Peer[] {
    return [...this.#viewers.values()];
  }

  /** Indica si la sala ya no tiene a nadie. */
  get isEmpty(): boolean {
    return !this.#broadcaster && this.#viewers.size === 0;
  }

  /** Busca un espectador por id. */
  viewer(id: string): Peer | undefined {
    return this.#viewers.get(id);
  }

  /**
   * Añade un participante.
   *
   * @returns `false` si es un emisor y la sala ya tiene uno.
   */
  add(peer: Peer): boolean {
    if (peer.role === "viewer") {
      this.#viewers.set(peer.id, peer);
      return true;
    }
    if (this.#broadcaster) return false;
    this.#broadcaster = peer;
    return true;
  }

  /** Quita un participante; no hace nada si no estaba. */
  remove(peer: Peer): void {
    if (this.#broadcaster?.id === peer.id) this.#broadcaster = undefined;
    else this.#viewers.delete(peer.id);
  }
}
