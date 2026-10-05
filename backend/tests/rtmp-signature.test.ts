import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import { signRtmpUrl } from "../src/modules/live-streams/rtmp-signature.ts";

const require = createRequire(import.meta.url);
const BroadcastServer = require("node-media-server/src/server/broadcast_server.js") as new (path: string) => {
  verifyAuth(secret: string, session: { streamPath: string; streamQuery: Record<string, string> }): boolean;
};

const SECRET = "secreto-de-prueba-1234";
const STREAM_PATH = "/live/abc";

/** Valida una URL firmada con el código real de node-media-server. */
const verifiedByNms = (url: string, secret = SECRET): boolean => {
  const { pathname, searchParams } = new URL(url.replace("rtmp://", "http://"));
  return new BroadcastServer(pathname).verifyAuth(secret, {
    streamPath: pathname,
    streamQuery: Object.fromEntries(searchParams),
  });
};

describe("signRtmpUrl", () => {
  it("produce una firma que node-media-server acepta", () => {
    const url = signRtmpUrl({ host: "127.0.0.1", port: 1935, streamPath: STREAM_PATH, secret: SECRET, ttlSeconds: 60 });
    assert.ok(url.startsWith("rtmp://127.0.0.1:1935/live/abc?sign="));
    assert.equal(verifiedByNms(url), true);
  });

  it("deja de ser válida al caducar", () => {
    const past = new Date(Date.now() - 120_000);
    const url = signRtmpUrl({ host: "h", port: 1, streamPath: STREAM_PATH, secret: SECRET, ttlSeconds: 60, now: past });
    assert.equal(verifiedByNms(url), false);
  });

  it("no vale con otro secreto", () => {
    const url = signRtmpUrl({ host: "h", port: 1, streamPath: STREAM_PATH, secret: SECRET, ttlSeconds: 60 });
    assert.equal(verifiedByNms(url, "otro-secreto-cualquiera"), false);
  });
});
