/**
 * Publica el vídeo del canvas hacia RTMP a través del backend: crea la emisión, abre el
 * WebSocket de ingesta, espera el `ready` del servidor y solo entonces arranca `MediaRecorder`,
 * para que el primer trozo (con la cabecera del contenedor) no se pierda.
 */
import { wsUrl } from "../../shared/ws-url.ts";
import { createLiveStream } from "./api.ts";
import { pickMimeType } from "./mime-type.ts";

const TIMESLICE_MS = 250;
const VIDEO_BITS_PER_SECOND = 2_500_000;

/** Ingesta en curso. */
export interface IngestHandle {
  streamId: string;
  stop(): void;
}

/** Arranca la grabación y envía cada trozo binario por el socket. */
const startRecorder = (stream: MediaStream, socket: WebSocket, mimeType: string): MediaRecorder => {
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: VIDEO_BITS_PER_SECOND });
  recorder.ondataavailable = ({ data }) => {
    if (data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(data);
  };
  recorder.onstop = () => socket.close(1000);
  recorder.start(TIMESLICE_MS);
  return recorder;
};

/**
 * Inicia la ingesta de `stream` para la sesión.
 *
 * @param onClosed - Se invoca cuando el servidor cierra la ingesta, con su motivo.
 * @throws Error si el navegador no puede grabar en ningún formato admitido.
 */
export const startIngest = async (
  stream: MediaStream,
  sessionId: string,
  onClosed: (reason: string) => void,
): Promise<IngestHandle> => {
  const mimeType = pickMimeType();
  if (!mimeType) throw new Error("Este navegador no puede grabar el canvas en WebM ni en MP4");
  const live = await createLiveStream(sessionId);
  const socket = new WebSocket(wsUrl(live.ingestPath));
  let recorder: MediaRecorder | undefined;
  socket.onmessage = () => {
    recorder ??= startRecorder(stream, socket, mimeType);
  };
  socket.onclose = (event) => {
    if (recorder?.state === "recording") recorder.stop();
    onClosed(event.reason || "Ingesta cerrada");
  };
  return {
    streamId: live.id,
    stop: () => (recorder?.state === "recording" ? recorder.stop() : socket.close(1000)),
  };
};
