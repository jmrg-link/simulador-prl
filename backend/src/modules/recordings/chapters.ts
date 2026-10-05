/**
 * Capítulos de la grabación: uno de inicio y uno por cada riesgo identificado, en milisegundos
 * desde que empezó a grabarse. Lógica pura para probarla sin FFmpeg.
 */

/** Capítulo de la grabación. */
export interface Chapter {
  title: string;
  startMs: number;
  endMs: number;
}

/**
 * Calcula los capítulos a partir de los riesgos identificados. Los instantes anteriores al
 * inicio de la grabación se llevan al cero y los posteriores al final se descartan.
 *
 * @param startedAt - Instante en que empezó a grabarse.
 * @param durationMs - Duración real del vídeo.
 */
export const buildChapters = (
  timeline: Array<{ label: string; detectedAt: Date }>,
  startedAt: Date,
  durationMs: number,
): Chapter[] => {
  const marks = timeline
    .map(({ label, detectedAt }) => ({ title: `Riesgo: ${label}`, startMs: Math.max(0, detectedAt.getTime() - startedAt.getTime()) }))
    .filter(({ startMs }) => startMs < durationMs)
    .sort((a, b) => a.startMs - b.startMs);
  const starts = [{ title: "Inicio de la formación", startMs: 0 }, ...marks.filter(({ startMs }) => startMs > 0)];
  return starts.map((chapter, index) => ({ ...chapter, endMs: starts[index + 1]?.startMs ?? durationMs }));
};

/** Serializa los capítulos en el formato FFMETADATA1 que lee FFmpeg con `-map_chapters`. */
export const toFfmetadata = (chapters: Chapter[]): string =>
  [
    ";FFMETADATA1",
    ...chapters.flatMap(({ title, startMs, endMs }) => [
      "[CHAPTER]",
      "TIMEBASE=1/1000",
      `START=${startMs}`,
      `END=${endMs}`,
      `title=${title.replace(/([=;#\\\n])/g, "\\$1")}`,
    ]),
    "",
  ].join("\n");
