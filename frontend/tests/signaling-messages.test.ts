import { describe, expect, it } from "vitest";
import { serverMessageSchema } from "../src/shared/signaling/messages.ts";

describe("serverMessageSchema", () => {
  it("acepta los mensajes que emite el backend", () => {
    const messages = [
      { type: "welcome", peerId: "p", role: "viewer", broadcasterOnline: false },
      { type: "viewer-joined", viewerId: "v" },
      { type: "offer", from: "b", sdp: "v=0" },
      { type: "candidate", from: "b", candidate: { candidate: "c", sdpMid: "0", sdpMLineIndex: 0 } },
      { type: "broadcaster-left" },
    ];
    for (const message of messages) expect(serverMessageSchema.safeParse(message).success).toBe(true);
  });

  it("rechaza un tipo desconocido o un campo ausente", () => {
    expect(serverMessageSchema.safeParse({ type: "hack" }).success).toBe(false);
    expect(serverMessageSchema.safeParse({ type: "offer", sdp: "v=0" }).success).toBe(false);
  });
});
