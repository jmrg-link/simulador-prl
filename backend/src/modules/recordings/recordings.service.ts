/**
 * Grabación de cada sesión de formación. El empaquetador del directo escribe un MP4 fragmentado
 * mientras dura la emisión; al terminar, este servicio lo remuxa a un MP4 final con `faststart` y
 * un capítulo por riesgo identificado, que es lo que se ve y se descarga en el informe.
 */
import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "../../shared/http/http-error.ts";
import { FfmpegProcess, probeDurationMs } from "../../shared/media/ffmpeg-process.ts";
import type { TrainingsService } from "../trainings/trainings.service.ts";
import { buildChapters, toFfmetadata, type Chapter } from "./chapters.ts";
import type { RecordingStatus, RecordingsRepository } from "./recordings.repository.ts";

/** Opciones de infraestructura del servicio. */
export interface RecordingsOptions {
  ffmpegPath: string;
  ffprobePath: string;
  recordingsDir: string;
}

/** Grabación tal como la consume el informe. */
export interface RecordingView {
  status: RecordingStatus;
  url: string | null;
  durationMs: number | null;
  chapters: Chapter[];
}

/** Rutas en disco de la grabación de una sesión. */
const pathsOf = (dir: string, sessionId: string) => ({
  part: join(dir, `${sessionId}.part.mp4`),
  metadata: join(dir, `${sessionId}.chapters.txt`),
  final: join(dir, `${sessionId}.mp4`),
});

/** Argumentos del remux final: misma señal, capítulos del archivo FFMETADATA y índice al principio. */
const remuxArgs = (part: string, metadata: string, final: string): string[] => [
  "-hide_banner", "-loglevel", "error", "-y",
  "-i", part, "-i", metadata,
  "-map", "0", "-map_metadata", "1", "-map_chapters", "1",
  "-c", "copy", "-movflags", "+faststart",
  final,
];

/** Servicio de grabaciones. */
export class RecordingsService {
  readonly #repository: RecordingsRepository;
  readonly #trainings: TrainingsService;
  readonly #options: RecordingsOptions;

  /**
   * Crea el servicio con sus dependencias.
   *
   * @param repository - Persistencia del estado de cada grabación.
   * @param trainings - Para obtener los riesgos identificados que dan los capítulos.
   * @param options - Binarios de FFmpeg y carpeta de las grabaciones.
   */
  constructor(repository: RecordingsRepository, trainings: TrainingsService, options: RecordingsOptions) {
    this.#repository = repository;
    this.#trainings = trainings;
    this.#options = options;
  }

  /**
   * Abre la grabación de la sesión y devuelve dónde debe escribir el empaquetador.
   *
   * @returns `null` si la sesión ya tenía grabación, para no pisarla.
   */
  async begin(sessionId: string): Promise<string | null> {
    const recording = await this.#repository.start(sessionId, new Date());
    return recording ? pathsOf(this.#options.recordingsDir, sessionId).part : null;
  }

  /** Remuxa la grabación con capítulos. Cualquier fallo deja la grabación en `FAILED`. */
  async finalize(sessionId: string): Promise<void> {
    const recording = await this.#repository.findBySession(sessionId);
    if (recording?.status !== "RECORDING") return;
    await this.#repository.update(sessionId, { status: "PROCESSING" });
    try {
      const durationMs = await this.#remux(sessionId, recording.startedAt);
      await this.#repository.update(sessionId, { status: "READY", durationMs });
    } catch (error) {
      console.error(`[grabación ${sessionId.slice(0, 8)}]`, error);
      await this.#repository.update(sessionId, { status: "FAILED" });
    }
  }

  /**
   * Estado, URL y capítulos de la grabación de una sesión.
   *
   * @throws HttpError 404 si la sesión no tiene grabación.
   */
  async view(sessionId: string): Promise<RecordingView> {
    const recording = await this.#repository.findBySession(sessionId);
    if (!recording) throw notFound("La grabación");
    if (recording.status !== "READY" || recording.durationMs === null) {
      return { status: recording.status, url: null, durationMs: recording.durationMs, chapters: [] };
    }
    const chapters = buildChapters(await this.#trainings.timeline(sessionId), recording.startedAt, recording.durationMs);
    return { status: "READY", url: `/recordings/${sessionId}.mp4`, durationMs: recording.durationMs, chapters };
  }

  /** Marca como fallidas las grabaciones que un reinicio dejó a medias. */
  async failOrphans(): Promise<void> {
    await this.#repository.failOrphans();
  }

  /** Escribe los capítulos, remuxa, borra los temporales y devuelve la duración. */
  async #remux(sessionId: string, startedAt: Date): Promise<number> {
    const paths = pathsOf(this.#options.recordingsDir, sessionId);
    const durationMs = await probeDurationMs(this.#options.ffprobePath, paths.part);
    const chapters = buildChapters(await this.#trainings.timeline(sessionId), startedAt, durationMs);
    await writeFile(paths.metadata, toFfmetadata(chapters));
    const remux = new FfmpegProcess(this.#options.ffmpegPath, remuxArgs(paths.part, paths.metadata, paths.final), `remux ${sessionId.slice(0, 8)}`);
    const code = await remux.exited;
    await rm(paths.metadata, { force: true });
    if (code !== 0) throw new Error(`El remux terminó con código ${code}`);
    await rm(paths.part, { force: true });
    return durationMs;
  }
}
