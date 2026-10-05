import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildChapters, toFfmetadata } from "../src/modules/recordings/chapters.ts";

const START = new Date("2026-10-05T10:00:00Z");
const at = (seconds: number): Date => new Date(START.getTime() + seconds * 1000);

describe("capítulos de la grabación", () => {
  it("abre con el inicio y añade un capítulo por riesgo, ordenados y encadenados", () => {
    const chapters = buildChapters(
      [
        { label: "Cable pelado", detectedAt: at(40) },
        { label: "Carga suspendida", detectedAt: at(12) },
      ],
      START,
      90_000,
    );
    assert.deepEqual(chapters, [
      { title: "Inicio de la formación", startMs: 0, endMs: 12_000 },
      { title: "Riesgo: Carga suspendida", startMs: 12_000, endMs: 40_000 },
      { title: "Riesgo: Cable pelado", startMs: 40_000, endMs: 90_000 },
    ]);
  });

  it("descarta los riesgos posteriores al final del vídeo", () => {
    const chapters = buildChapters([{ label: "Tarde", detectedAt: at(200) }], START, 60_000);
    assert.equal(chapters.length, 1);
  });

  it("serializa en FFMETADATA1 escapando los caracteres especiales", () => {
    const text = toFfmetadata([{ title: "A=B; #1", startMs: 0, endMs: 1000 }]);
    assert.equal(text, ";FFMETADATA1\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=0\nEND=1000\ntitle=A\\=B\\; \\#1\n");
  });
});
