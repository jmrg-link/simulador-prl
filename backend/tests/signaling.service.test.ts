import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { Peer } from "../src/modules/signaling/room.ts";
import type { ServerMessage } from "../src/modules/signaling/signaling.messages.ts";
import { SignalingService } from "../src/modules/signaling/signaling.service.ts";

/** Peer de prueba que acumula lo que recibe. */
const fakePeer = (id: string, role: Peer["role"]): Peer & { inbox: ServerMessage[] } => {
  const inbox: ServerMessage[] = [];
  return { id, role, inbox, send: (message) => inbox.push(message) };
};

describe("SignalingService", () => {
  let service: SignalingService;
  beforeEach(() => {
    service = new SignalingService();
  });

  it("avisa al emisor cuando entra un espectador", () => {
    const broadcaster = fakePeer("b", "broadcaster");
    const viewer = fakePeer("v", "viewer");
    service.join("sala", broadcaster);
    service.join("sala", viewer);
    assert.deepEqual(broadcaster.inbox.at(-1), { type: "viewer-joined", viewerId: "v" });
    assert.deepEqual(viewer.inbox[0], { type: "welcome", peerId: "v", role: "viewer", broadcasterOnline: true });
  });

  it("un emisor que llega tarde recibe a los espectadores que esperaban", () => {
    const viewers = [fakePeer("v1", "viewer"), fakePeer("v2", "viewer")];
    for (const viewer of viewers) service.join("sala", viewer);
    const broadcaster = fakePeer("b", "broadcaster");
    service.join("sala", broadcaster);
    const joined = broadcaster.inbox.filter((m) => m.type === "viewer-joined").map((m) => m.type === "viewer-joined" && m.viewerId);
    assert.deepEqual(joined, ["v1", "v2"]);
    assert.ok(viewers.every((viewer) => viewer.inbox.some((m) => m.type === "broadcaster-joined")));
  });

  it("rechaza un segundo emisor en la misma sala", () => {
    assert.equal(service.join("sala", fakePeer("b1", "broadcaster")), true);
    assert.equal(service.join("sala", fakePeer("b2", "broadcaster")), false);
  });

  it("reenvía oferta, respuesta y candidatos entre emisor y espectador", () => {
    const broadcaster = fakePeer("b", "broadcaster");
    const viewer = fakePeer("v", "viewer");
    service.join("sala", broadcaster);
    service.join("sala", viewer);
    service.relay("sala", broadcaster, { type: "offer", to: "v", sdp: "OFERTA" });
    service.relay("sala", viewer, { type: "answer", sdp: "RESPUESTA" });
    service.relay("sala", viewer, { type: "candidate", candidate: { candidate: "c1" } });
    assert.deepEqual(viewer.inbox.at(-1), { type: "offer", from: "b", sdp: "OFERTA" });
    assert.deepEqual(broadcaster.inbox.slice(-2), [
      { type: "answer", from: "v", sdp: "RESPUESTA" },
      { type: "candidate", from: "v", candidate: { candidate: "c1" } },
    ]);
  });

  it("solo el emisor puede ofertar", () => {
    const viewer = fakePeer("v", "viewer");
    service.join("sala", fakePeer("b", "broadcaster"));
    service.join("sala", viewer);
    service.relay("sala", viewer, { type: "offer", to: "b", sdp: "x" });
    assert.equal(viewer.inbox.at(-1)?.type, "error");
  });

  it("avisa a los espectadores cuando el emisor se va y libera la sala vacía", () => {
    const broadcaster = fakePeer("b", "broadcaster");
    const viewer = fakePeer("v", "viewer");
    service.join("sala", broadcaster);
    service.join("sala", viewer);
    service.leave("sala", broadcaster);
    assert.deepEqual(viewer.inbox.at(-1), { type: "broadcaster-left" });
    service.leave("sala", viewer);
    assert.equal(service.join("sala", fakePeer("b2", "broadcaster")), true);
  });
});
