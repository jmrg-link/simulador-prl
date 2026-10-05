/**
 * Vídeo de la sesión en el informe: espera a que el servidor termine de procesar la grabación y
 * la muestra con una lista de capítulos, uno por riesgo identificado, para saltar a cada momento.
 */
import { useEffect, useRef, useState } from "react";
import type { Recording } from "../../shared/api/schemas.ts";
import { Icon } from "../../shared/ui/Icon.tsx";
import { SectionTitle } from "../../shared/ui/SectionTitle.tsx";
import { formatClock } from "../headset/scene/broadcast-overlay.ts";
import { getRecording } from "../training/api.ts";

const POLL_MS = 2_000;

/** Estado de la consulta de la grabación. */
type RecordingLoad = { kind: "esperando" } | { kind: "lista"; recording: Recording } | { kind: "sin-grabacion" } | { kind: "fallida" };

/** Consulta la grabación hasta que está lista o falla. */
const useRecording = (sessionId: string): RecordingLoad => {
  const [load, setLoad] = useState<RecordingLoad>({ kind: "esperando" });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = () =>
      getRecording(sessionId).then(
        (recording) => {
          if (recording.status === "READY") setLoad({ kind: "lista", recording });
          else if (recording.status === "FAILED") setLoad({ kind: "fallida" });
          else timer = setTimeout(poll, POLL_MS);
        },
        () => setLoad({ kind: "sin-grabacion" }),
      );
    void poll();
    return () => clearTimeout(timer);
  }, [sessionId]);
  return load;
};

/** Mensaje en el hueco del vídeo mientras no hay nada que reproducir. */
const VideoNotice = ({ children }: { children: string }) => (
  <div className="flex aspect-video w-full items-center justify-center bg-navy px-6 text-center caps text-coupon/85">{children}</div>
);

/** Reproductor con capítulos de una grabación lista. */
const ChapteredVideo = ({ recording }: { recording: Recording }) => {
  const video = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(0);
  const seek = (startMs: number) => {
    if (!video.current) return;
    video.current.currentTime = startMs / 1000;
    void video.current.play();
  };
  const active = recording.chapters.findLastIndex((chapter) => chapter.startMs <= current * 1000);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <video
        ref={video}
        src={recording.url ?? undefined}
        controls
        playsInline
        preload="metadata"
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        className="aspect-video w-full bg-navy"
      />
      <div className="space-y-2">
        <p className="caps text-xs text-navy-soft">Capítulos</p>
        <ol className="space-y-1.5">
          {recording.chapters.map((chapter, index) => (
            <li key={chapter.startMs}>
              <button
                type="button"
                onClick={() => seek(chapter.startMs)}
                aria-current={index === active ? "true" : undefined}
                className={`flex w-full items-baseline gap-3 border px-3 py-2 text-left text-body transition-colors ${
                  index === active ? "border-carbon bg-carbon-copy text-carbon" : "border-rule bg-coupon hover:border-navy"
                }`}
              >
                <span className="carbon text-sm">{formatClock(chapter.startMs / 1000)}</span>
                <span className="min-w-0 flex-1">{chapter.title}</span>
              </button>
            </li>
          ))}
        </ol>
        {recording.url && (
          <a href={recording.url} download className="inline-flex items-center gap-2 caps text-xs underline underline-offset-2">
            <Icon name="external" /> Descargar MP4
          </a>
        )}
      </div>
    </div>
  );
};

/** Sección del informe con la grabación de la sesión. */
export const SessionRecording = ({ sessionId }: { sessionId: string }) => {
  const load = useRecording(sessionId);
  return (
    <section aria-labelledby="grabacion" className="space-y-4">
      <SectionTitle id="grabacion">Grabación de la sesión</SectionTitle>
      {load.kind === "esperando" && <VideoNotice>Procesando la grabación…</VideoNotice>}
      {load.kind === "sin-grabacion" && <VideoNotice>Esta sesión no se llegó a grabar</VideoNotice>}
      {load.kind === "fallida" && <VideoNotice>No se pudo procesar la grabación</VideoNotice>}
      {load.kind === "lista" && <ChapteredVideo recording={load.recording} />}
    </section>
  );
};
