/**
 * Mediador entre los participantes de cada sala: decide a quién se reenvía cada mensaje y
 * avisa de entradas y salidas. No conoce WebSocket, así que se prueba con `Peer` falsos.
 */
import { Room, type Peer } from "./room.ts";
import type { ClientMessage } from "./signaling.messages.ts";

/** Mediador de señalización para todas las salas. */
export class SignalingService {
  readonly #rooms = new Map<string, Room>();

  /**
   * Une a `peer` a la sala `roomId` y avisa a la otra parte. Un emisor que llega tarde recibe
   * un `viewer-joined` por cada espectador que ya esperaba, para ofertarle.
   *
   * @returns `false` si la sala ya tiene emisor y `peer` también lo es.
   */
  join(roomId: string, peer: Peer): boolean {
    const room = this.#rooms.get(roomId) ?? new Room();
    if (!room.add(peer)) return false;
    this.#rooms.set(roomId, room);
    peer.send({ type: "welcome", peerId: peer.id, role: peer.role, broadcasterOnline: !!room.broadcaster });
    if (peer.role === "viewer") room.broadcaster?.send({ type: "viewer-joined", viewerId: peer.id });
    else this.#announceBroadcaster(room, peer);
    return true;
  }

  /** Saca a `peer` de la sala, avisa a la otra parte y borra la sala si queda vacía. */
  leave(roomId: string, peer: Peer): void {
    const room = this.#rooms.get(roomId);
    if (!room) return;
    room.remove(peer);
    if (peer.role === "viewer") room.broadcaster?.send({ type: "viewer-left", viewerId: peer.id });
    else for (const viewer of room.viewers) viewer.send({ type: "broadcaster-left" });
    if (room.isEmpty) this.#rooms.delete(roomId);
  }

  /** Reenvía un mensaje validado según el papel de quien lo manda. */
  relay(roomId: string, from: Peer, message: ClientMessage): void {
    const room = this.#rooms.get(roomId);
    if (!room) return;
    if (from.role === "broadcaster") this.#relayFromBroadcaster(room, from, message);
    else this.#relayFromViewer(room, from, message);
  }

  /** Avisa a los espectadores de que hay emisor y al emisor de cada espectador pendiente. */
  #announceBroadcaster(room: Room, broadcaster: Peer): void {
    for (const viewer of room.viewers) {
      viewer.send({ type: "broadcaster-joined" });
      broadcaster.send({ type: "viewer-joined", viewerId: viewer.id });
    }
  }

  /** El emisor oferta y manda candidatos a un espectador concreto; no contesta ofertas. */
  #relayFromBroadcaster(room: Room, from: Peer, message: ClientMessage): void {
    if (message.type === "answer") return from.send({ type: "error", message: "El emisor no contesta ofertas" });
    const target = message.to ? room.viewer(message.to) : undefined;
    if (!target) return from.send({ type: "error", message: "Espectador desconocido" });
    if (message.type === "offer") target.send({ type: "offer", from: from.id, sdp: message.sdp });
    else target.send({ type: "candidate", from: from.id, candidate: message.candidate });
  }

  /** El espectador solo contesta y manda candidatos, siempre al emisor. */
  #relayFromViewer(room: Room, from: Peer, message: ClientMessage): void {
    if (message.type === "offer") return from.send({ type: "error", message: "Solo el emisor oferta" });
    const target = room.broadcaster;
    if (!target) return from.send({ type: "error", message: "No hay emisor en la sala" });
    if (message.type === "answer") target.send({ type: "answer", from: from.id, sdp: message.sdp });
    else target.send({ type: "candidate", from: from.id, candidate: message.candidate });
  }
}
