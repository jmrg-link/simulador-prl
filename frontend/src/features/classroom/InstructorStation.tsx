/**
 * Puesto del instructor: recibe la vista del alumno por WebRTC o por el directo HLS, controla la
 * difusión RTMP y sigue el talonario de riesgos con las métricas que llegan por SSE.
 */
import { useEffect, useRef, useState } from "react";
import { liveStreamSchema, metricsSchema, type Scenario } from "../../shared/api/schemas.ts";
import { useEventStream } from "../../shared/hooks/useEventStream.ts";
import { Icon } from "../../shared/ui/Icon.tsx";
import { SectionTitle } from "../../shared/ui/SectionTitle.tsx";
import { spectatorUrl } from "../../shared/share-url.ts";
import type { ViewerStatus } from "../instructor/Viewer.ts";
import { useViewer } from "../instructor/useViewer.ts";
import { liveStreamEventsUrl } from "../live/api.ts";
import { HlsPlayer } from "../live/HlsPlayer.tsx";
import type { IngestState } from "../live/useIngest.ts";
import { trainingEventsUrl } from "../training/api.ts";
import { CouponColumns, HazardCoupon } from "./HazardCoupon.tsx";

/** Señal que está viendo el instructor. */
type Signal = "webrtc" | "hls";

/** Texto visible de cada estado de la conexión WebRTC. */
const VIEWER_STATUS: Record<ViewerStatus, string> = {
  conectando: "Conectando",
  "esperando-emisor": "Esperando al alumno",
  negociando: "Negociando",
  "en-directo": "En directo",
};

/** `<video>` que reproduce un `MediaStream` en vivo. */
const StreamVideo = ({ stream }: { stream: MediaStream | null }) => {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);
  return <video ref={video} className="aspect-video w-full bg-navy" autoPlay muted playsInline aria-label="Vista del alumno recibida por WebRTC" />;
};

/** Reproductor del directo HLS que sigue el estado de la emisión por SSE. */
const HlsSignal = ({ streamId }: { streamId: string | null }) => {
  const stream = useEventStream(streamId ? liveStreamEventsUrl(streamId) : null, liveStreamSchema);
  if (stream?.status === "LIVE") return <HlsPlayer src={stream.hlsUrl} />;
  const message = !streamId ? "Activa la difusión RTMP para generar el directo HLS." : "Generando los primeros segmentos HLS…";
  return <div className="flex aspect-video items-center justify-center bg-navy px-6 text-center text-white/90">{message}</div>;
};

/** Pestaña de selección de señal con su retardo típico. */
const SignalTab = ({ active, onSelect, label, latency, audience }: { active: boolean; onSelect(): void; label: string; latency: string; audience: string }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onSelect}
    className={`tab px-4 pt-2 pb-1.5 text-left transition-colors ${active ? "bg-navy text-white" : "bg-rule/60 text-navy hover:bg-rule"}`}
  >
    <span className="block caps text-sm">{label}</span>
    <span className="block text-xs opacity-85">
      <span className="font-mono">{latency}</span> · <span className="caps">{audience}</span>
    </span>
  </button>
);

/** Enlace del directo HLS para abrirlo en otro equipo de la red, con copiar y abrir. */
const ShareLink = ({ streamId }: { streamId: string }) => {
  const url = spectatorUrl(streamId);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 border border-navy bg-coupon px-3 py-2">
      <Icon name="link" className="text-base text-carbon" />
      <span className="caps text-xs text-navy-soft">Enlace del directo</span>
      <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-mono text-xs text-carbon underline underline-offset-2">
        {url}
      </a>
      <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 caps text-xs hover:text-jet" aria-live="polite">
        <Icon name="copy" className="text-sm" />
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
};

/** Aviso accesible del estado de la difusión; solo ocupa espacio cuando hay un error que leer. */
const IngestNotice = ({ state }: { state: IngestState }) => {
  const error = state.kind === "parada" && state.message ? `Difusión RTMP detenida: ${state.message}.` : null;
  const status = state.kind === "emitiendo" ? "Difundiendo por RTMP." : "";
  return (
    <p aria-live="polite" className={error ? "mt-2 text-sm text-jet" : "sr-only"}>
      {error ?? status}
    </p>
  );
};

/**
 * Estado de la grabación y la difusión, que arrancan solas con la sesión. Solo ofrece una acción
 * cuando la ingesta se ha caído, para reintentarla.
 */
const RecordingStatus = ({ state, onRetry }: { state: IngestState; onRetry(): void }) => {
  if (state.kind === "emitiendo") {
    return (
      <span className="mb-1 inline-flex items-center gap-2 bg-carbon px-3 py-1.5 caps text-xs text-coupon">
        <span className="size-2 rounded-full bg-coupon" aria-hidden /> Grabando y difundiendo
      </span>
    );
  }
  if (state.kind === "arrancando") return <span className="mb-1 caps text-xs text-navy-soft">Conectando la grabación…</span>;
  return (
    <button
      type="button"
      onClick={onRetry}
      className="mb-1 inline-flex items-center gap-2 border-2 border-jet px-3 py-1.5 caps text-xs text-jet transition-colors hover:bg-jet hover:text-coupon"
    >
      <Icon name="restart" className="text-sm" /> Reintentar grabación
    </button>
  );
};

/** Props del puesto del instructor. */
interface InstructorStationProps {
  sessionId: string;
  scenario: Scenario;
  ingest: { state: IngestState; start(): Promise<void>; stop(): void };
}

/** Puesto completo del instructor. */
export const InstructorStation = ({ sessionId, scenario, ingest }: InstructorStationProps) => {
  const [signal, setSignal] = useState<Signal>("webrtc");
  const viewer = useViewer(sessionId);
  const metrics = useEventStream(trainingEventsUrl(sessionId), metricsSchema);
  const streamId = ingest.state.kind === "emitiendo" ? ingest.state.streamId : null;
  const byId = new Map(metrics?.hazards.map((hazard) => [hazard.id, hazard]));

  return (
    <section aria-labelledby="instructor" className="min-w-0 space-y-4">
      <SectionTitle
        id="instructor"
        aside={<span className="caps text-xs text-navy-soft">WebRTC · {VIEWER_STATUS[viewer.status]}</span>}
      >
        Puesto del instructor
      </SectionTitle>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div role="tablist" aria-label="Señal recibida" className="flex gap-1">
            <SignalTab active={signal === "webrtc"} onSelect={() => setSignal("webrtc")} label="WebRTC" latency="< 1 s" audience="Instructor" />
            <SignalTab active={signal === "hls"} onSelect={() => setSignal("hls")} label="Directo HLS" latency="≈ 2–3 s" audience="Difusión" />
          </div>
          <RecordingStatus state={ingest.state} onRetry={() => void ingest.start()} />
        </div>
        <div role="tabpanel">{signal === "webrtc" ? <StreamVideo stream={viewer.stream} /> : <HlsSignal streamId={streamId} />}</div>
        {streamId && <ShareLink streamId={streamId} />}
        <IngestNotice state={ingest.state} />
      </div>

      <div className="space-y-2">
        <SectionTitle
          aside={
            <span className="carbon text-sm" aria-live="polite">
              {metrics?.detected ?? 0}/{scenario.hazards.length}
            </span>
          }
        >
          Talonario de riesgos
        </SectionTitle>
        <CouponColumns />
        <ol className="space-y-2">
          {scenario.hazards.map((hazard, index) => {
            const progress = byId.get(hazard.id);
            return (
              <HazardCoupon
                key={hazard.id}
                hazard={hazard}
                index={index}
                state={progress?.detected ? "identificado" : "pendiente"}
                reactionMs={progress?.reactionMs ?? null}
                note={progress?.detected ? (progress.decided ? "Decisión registrada" : "Decidiendo…") : undefined}
              />
            );
          })}
        </ol>
      </div>
    </section>
  );
};
