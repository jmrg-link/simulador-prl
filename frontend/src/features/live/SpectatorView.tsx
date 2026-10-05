/**
 * Página del espectador (`/directo/<id>`): el directo HLS de una sesión para cualquier equipo de
 * la red, sin WebRTC ni controles. Sigue el estado de la emisión por SSE.
 */
import { liveStreamSchema, metricsSchema } from "../../shared/api/schemas.ts";
import { useEventStream } from "../../shared/hooks/useEventStream.ts";
import { FullscreenFrame } from "../../shared/ui/FullscreenFrame.tsx";
import { SectionTitle } from "../../shared/ui/SectionTitle.tsx";
import { trainingEventsUrl } from "../training/api.ts";
import { liveStreamEventsUrl } from "./api.ts";
import { HlsPlayer } from "./HlsPlayer.tsx";

/** Mensaje a pantalla completa del reproductor cuando aún no hay o ya no hay vídeo. */
const PlayerNotice = ({ children }: { children: string }) => (
  <div className="flex h-full w-full items-center justify-center bg-navy px-6 text-center caps text-coupon/85">{children}</div>
);

/** Reproductor según el estado de la emisión. */
const Player = ({ status, hlsUrl }: { status: "STARTING" | "LIVE" | "ENDED" | undefined; hlsUrl: string | undefined }) => {
  if (status === "LIVE" && hlsUrl) return <HlsPlayer src={hlsUrl} />;
  if (status === "ENDED") return <PlayerNotice>La emisión ha terminado</PlayerNotice>;
  if (status === "STARTING") return <PlayerNotice>La emisión está arrancando…</PlayerNotice>;
  return <PlayerNotice>Conectando con la emisión…</PlayerNotice>;
};

/** Directo HLS de una emisión con el nombre del alumno y su recuento de riesgos. */
export const SpectatorView = ({ streamId }: { streamId: string }) => {
  const stream = useEventStream(liveStreamEventsUrl(streamId), liveStreamSchema);
  const metrics = useEventStream(stream ? trainingEventsUrl(stream.sessionId) : null, metricsSchema);
  return (
    <section aria-labelledby="directo" className="mx-auto max-w-desk space-y-4">
      <SectionTitle
        id="directo"
        aside={metrics && <span className="carbon text-sm">{`${metrics.detected}/${metrics.total}`}</span>}
      >
        {metrics ? `Directo · ${metrics.traineeName}` : "Directo"}
      </SectionTitle>
      <FullscreenFrame label="Directo">
        <Player status={stream?.status} hlsUrl={stream?.hlsUrl} />
      </FullscreenFrame>
      <p className="text-sm text-navy-soft">Difusión HLS: llega con unos segundos de retardo respecto a lo que ve el alumno.</p>
    </section>
  );
};
