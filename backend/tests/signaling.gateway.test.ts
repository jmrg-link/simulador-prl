import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { WebSocket } from "ws";
import { createSignalingModule } from "../src/modules/signaling/signaling.module.ts";
import { attachUpgradeRouter } from "../src/shared/ws/upgrade-router.ts";

const ORIGIN = "http://localhost:5173";

describe("gateway de señalización", () => {
  let server: Server;
  let base: string;
  const signaling = createSignalingModule();
  const sockets: WebSocket[] = [];

  before(async () => {
    server = createServer();
    attachUpgradeRouter(server, [ORIGIN], [signaling.gateway.route]);
    server.listen(0);
    await once(server, "listening");
    base = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(() => {
    for (const socket of sockets) socket.terminate();
    signaling.gateway.close();
    server.close();
  });

  const connect = async (path: string, origin = ORIGIN) => {
    const socket = new WebSocket(`${base}${path}`, { origin });
    sockets.push(socket);
    const queue: unknown[] = [];
    const waiters: Array<(value: unknown) => void> = [];
    socket.on("message", (data) => {
      const message: unknown = JSON.parse(data.toString());
      const waiter = waiters.shift();
      if (waiter) waiter(message);
      else queue.push(message);
    });
    await once(socket, "open");
    const next = (): Promise<unknown> =>
      queue.length > 0 ? Promise.resolve(queue.shift()) : new Promise((resolve) => waiters.push(resolve));
    return { socket, next };
  };

  it("rechaza un Origin no permitido con 403 antes del handshake", async () => {
    const socket = new WebSocket(`${base}/ws/signaling/sala?role=viewer`, { origin: "http://evil.test" });
    const [, response] = (await once(socket, "unexpected-response")) as [unknown, { statusCode: number }];
    assert.equal(response.statusCode, 403);
  });

  it("negocia oferta y respuesta a través del servidor", async () => {
    const broadcaster = await connect("/ws/signaling/sala-1?role=broadcaster");
    assert.equal(((await broadcaster.next()) as { type: string }).type, "welcome");
    const viewer = await connect("/ws/signaling/sala-1?role=viewer");
    const welcome = (await viewer.next()) as { peerId: string; broadcasterOnline: boolean };
    assert.equal(welcome.broadcasterOnline, true);
    assert.deepEqual(await broadcaster.next(), { type: "viewer-joined", viewerId: welcome.peerId });

    broadcaster.socket.send(JSON.stringify({ type: "offer", to: welcome.peerId, sdp: "v=0" }));
    assert.deepEqual(((await viewer.next()) as { type: string; sdp: string }).sdp, "v=0");
    viewer.socket.send(JSON.stringify({ type: "answer", sdp: "v=1" }));
    assert.equal(((await broadcaster.next()) as { sdp: string }).sdp, "v=1");
  });

  it("contesta con error a un mensaje que no cumple el protocolo", async () => {
    const viewer = await connect("/ws/signaling/sala-2?role=viewer");
    await viewer.next();
    viewer.socket.send("{no es json");
    assert.deepEqual(await viewer.next(), { type: "error", message: "Mensaje inválido" });
  });

  it("cierra con 4409 al segundo emisor", async () => {
    await connect("/ws/signaling/sala-3?role=broadcaster");
    const second = new WebSocket(`${base}/ws/signaling/sala-3?role=broadcaster`, { origin: ORIGIN });
    sockets.push(second);
    const [code] = (await once(second, "close")) as [number];
    assert.equal(code, 4409);
  });
});
