import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hlsArgs, ingestArgs } from "../src/modules/live-streams/ffmpeg.ts";

describe("argumentos de FFmpeg", () => {
  it("la ingesta escala a un ancho fijo con alto par, que exige yuv420p", () => {
    const args = ingestArgs("rtmp://127.0.0.1:1935/live/x?sign=1-a");
    assert.equal(args[args.indexOf("-vf") + 1], "scale=1280:-2");
    assert.equal(args.at(-1), "rtmp://127.0.0.1:1935/live/x?sign=1-a");
  });

  it("ninguna entrada usa nobuffer, que impide decodificar el WebM del navegador", () => {
    const all = [...ingestArgs("rtmp://h/live/x"), ...hlsArgs("rtmp://h/live/x", "/tmp/out", "/tmp/rec.mp4")];
    assert.ok(all.every((arg) => !arg.includes("nobuffer")));
  });

  it("graba en MP4 fragmentado con vaciado inmediato, legible aunque el proceso muera", () => {
    const args = hlsArgs("rtmp://h/live/x", "/tmp/out", "/tmp/rec.mp4");
    assert.equal(args.at(-1), "/tmp/rec.mp4");
    assert.ok(args.includes("+frag_keyframe+empty_moov+default_base_moof"));
    assert.equal(args[args.indexOf("-flush_packets") + 1], "1");
  });

  it("el empaquetado termina solo cuando el emisor deja de enviar", () => {
    const args = hlsArgs("rtmp://h/live/x", "/tmp/out");
    assert.equal(args[args.indexOf("-rw_timeout") + 1], "5000000");
    assert.equal(args.at(-1), "/tmp/out/index.m3u8");
  });
});
