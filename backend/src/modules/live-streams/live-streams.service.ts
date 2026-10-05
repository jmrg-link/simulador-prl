/**
 * Orquesta cada emisión: navegador → (WebSocket) → FFmpeg de ingesta → RTMP firmado en
 * node-media-server → FFmpeg empaquetador → HLS en disco, que sirve Express.
 * Cada cambio de estado se persiste y se publica en el `Topic` para el SSE.
 */
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { Topic } from "../../shared/events/topic.ts";
import { conflict, notFound } from "../../shared/http/http-error.ts";
import type { TrainingsService } from "../trainings/trainings.service.ts";
import { FfmpegProcess } from "../../shared/media/ffmpeg-process.ts";
import type { RecordingsService } from "../recordings/recordings.service.ts";
import { hlsArgs, ingestArgs } from "./ffmpeg.ts";
import { RTMP_APP, type MediaServer } from "./media-server.ts";
import type { LiveStream, LiveStreamsRepository, TRANSITIONS } from "./live-streams.repository.ts";
import { signRtmpUrl } from "./rtmp-signature.ts";

/** Emisión con las rutas que necesita el cliente. */
export type LiveStreamView = LiveStream & { hlsUrl: string; ingestPath: string };

/** Extremo de escritura de una ingesta abierta. */
export interface IngestSink {
  write(chunk: Buffer): void;
  end(): void;
}

/** Opciones de infraestructura del servicio. */
export interface LiveStreamsOptions {
  ffmpegPath: string;
  mediaDir: string;
  rtmpPort: number;
  rtmpSecret: string;
}

/** Procesos y sondeo vivos de una emisión. */
interface Pipeline {
  sessionId: string;
  recording: boolean;
  publisher: FfmpegProcess;
  packager?: FfmpegProcess;
  playlistPoll?: NodeJS.Timeout;
}

const SIGNED_URL_TTL_SECONDS = 60;
const PLAYLIST_POLL_MS = 500;
/** Mensaje con el que el empaquetador termina cuando el alumno deja de emitir y salta `-rw_timeout`. */
const INPUT_ENDED = /Error during demuxing: Input\/output error/;

/** Añade a la emisión las rutas públicas de HLS y de ingesta. */
export const toView = (stream: LiveStream): LiveStreamView => ({
  ...stream,
  hlsUrl: `/media/${stream.id}/index.m3u8`,
  ingestPath: `/ws/ingest/${stream.id}`,
});

/** Servicio de emisiones RTMP → HLS. */
export class LiveStreamsService {
  readonly #repository: LiveStreamsRepository;
  readonly #trainings: TrainingsService;
  readonly #statusTopic: Topic<LiveStreamView>;
  readonly #options: LiveStreamsOptions;
  readonly #recordings: RecordingsService;
  readonly #pipelines = new Map<string, Pipeline>();

  /**
   * Crea el servicio y engancha el empaquetado HLS a cada publicación que acepta el servidor RTMP.
   *
   * @param repository - Persistencia y máquina de estados de las emisiones.
   * @param trainings - Para comprobar que la sesión existe y sigue abierta.
   * @param mediaServer - Servidor RTMP; el servicio arranca el empaquetado al aceptar cada publicación.
   * @param statusTopic - Bus donde se publica cada cambio de estado.
   * @param options - Rutas, puerto y secreto de la infraestructura de vídeo.
   * @param recordings - Graba cada sesión en MP4 a partir del mismo empaquetador.
   */
  constructor(
    repository: LiveStreamsRepository,
    trainings: TrainingsService,
    mediaServer: MediaServer,
    statusTopic: Topic<LiveStreamView>,
    options: LiveStreamsOptions,
    recordings: RecordingsService,
  ) {
    this.#repository = repository;
    this.#recordings = recordings;
    this.#trainings = trainings;
    this.#statusTopic = statusTopic;
    this.#options = options;
    mediaServer.onPublish((streamName) => void this.#startPackager(streamName));
  }

  /**
   * Crea una emisión en `STARTING` para una sesión abierta.
   *
   * @throws HttpError 404 si la sesión no existe; 409 si terminó o ya tiene una emisión activa.
   */
  async create(sessionId: string): Promise<LiveStreamView> {
    const session = await this.#trainings.get(sessionId);
    if (session.endedAt) throw conflict("La sesión ya terminó");
    if (await this.#repository.findActiveBySession(sessionId)) throw conflict("La sesión ya tiene una emisión activa");
    return this.#publish(await this.#repository.create(sessionId));
  }

  /** Emisiones en `STARTING` o `LIVE`. */
  async listActive(): Promise<LiveStreamView[]> {
    return (await this.#repository.listActive()).map(toView);
  }

  /**
   * Emisión por id.
   *
   * @throws HttpError 404 si no existe.
   */
  async get(id: string): Promise<LiveStreamView> {
    const stream = await this.#repository.findById(id);
    if (!stream) throw notFound("La emisión");
    return toView(stream);
  }

  /**
   * Abre la ingesta de una emisión en `STARTING` lanzando FFmpeg hacia el RTMP firmado.
   *
   * @throws HttpError 404 si no existe; 409 si no está en `STARTING` o ya tiene una ingesta.
   */
  async openIngest(id: string): Promise<IngestSink> {
    const stream = await this.get(id);
    if (stream.status !== "STARTING" || this.#pipelines.has(id)) throw conflict("La emisión no admite ingesta");
    const publisher = new FfmpegProcess(this.#options.ffmpegPath, ingestArgs(this.#signedUrl(id)), `ingesta ${id.slice(0, 8)}`);
    this.#pipelines.set(id, { sessionId: stream.sessionId, recording: false, publisher });
    void publisher.exited.then(() => this.#onPublisherExit(id));
    return { write: (chunk) => publisher.write(chunk), end: () => publisher.endInput() };
  }

  /** Marca como terminadas las emisiones que un reinicio dejó a medias. */
  async endOrphans(): Promise<void> {
    await this.#repository.endOrphans(new Date());
  }

  /** Detiene todas las emisiones en curso y las marca como terminadas. */
  async stopAll(): Promise<void> {
    await Promise.all(
      [...this.#pipelines.entries()].map(async ([id, { publisher, packager }]) => {
        await Promise.all([publisher.stop(), packager?.stop()]);
        await this.#end(id);
      }),
    );
  }

  /** URL RTMP firmada y de vida corta para la emisión. */
  #signedUrl(id: string): string {
    return signRtmpUrl({
      host: "127.0.0.1",
      port: this.#options.rtmpPort,
      streamPath: `/${RTMP_APP}/${id}`,
      secret: this.#options.rtmpSecret,
      ttlSeconds: SIGNED_URL_TTL_SECONDS,
    });
  }

  /** Lanza el empaquetador HLS cuando NMS acepta la publicación de una ingesta propia. */
  async #startPackager(id: string): Promise<void> {
    const pipeline = this.#pipelines.get(id);
    if (!pipeline || pipeline.packager) return;
    const outDir = join(this.#options.mediaDir, id);
    await mkdir(outDir, { recursive: true });
    const recordingPath = await this.#recordings.begin(pipeline.sessionId);
    pipeline.recording = recordingPath !== null;
    pipeline.packager = new FfmpegProcess(this.#options.ffmpegPath, hlsArgs(this.#signedUrl(id), outDir, recordingPath), `hls ${id.slice(0, 8)}`, INPUT_ENDED);
    pipeline.playlistPoll = setInterval(() => this.#checkPlaylist(id, outDir), PLAYLIST_POLL_MS);
    void pipeline.packager.exited.then(() => this.#end(id));
  }

  /** Pasa la emisión a `LIVE` en cuanto existe la primera playlist. */
  #checkPlaylist(id: string, outDir: string): void {
    const pipeline = this.#pipelines.get(id);
    if (!pipeline || !existsSync(join(outDir, "index.m3u8"))) return;
    clearInterval(pipeline.playlistPoll);
    void this.#transition(id, "LIVE");
  }

  /** Si la ingesta muere sin haber llegado a publicar, la emisión termina aquí. */
  #onPublisherExit(id: string): void {
    if (!this.#pipelines.get(id)?.packager) void this.#end(id);
  }

  /** Libera procesos y ficheros de la emisión y la marca como terminada. Es idempotente. */
  async #end(id: string): Promise<void> {
    const pipeline = this.#pipelines.get(id);
    if (!pipeline) return;
    this.#pipelines.delete(id);
    clearInterval(pipeline.playlistPoll);
    await pipeline.publisher.stop();
    await this.#transition(id, "ENDED");
    await rm(join(this.#options.mediaDir, id), { recursive: true, force: true });
    if (pipeline.recording) await this.#recordings.finalize(pipeline.sessionId);
  }

  /** Aplica la transición y publica el nuevo estado si se produjo. */
  async #transition(id: string, to: keyof typeof TRANSITIONS): Promise<void> {
    const updated = await this.#repository.transition(id, to, new Date());
    if (updated) this.#publish(updated);
  }

  /** Publica la emisión en el bus y devuelve su vista. */
  #publish(stream: LiveStream): LiveStreamView {
    const view = toView(stream);
    this.#statusTopic.publish(stream.id, view);
    return view;
  }
}
