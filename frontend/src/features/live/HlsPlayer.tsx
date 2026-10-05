/**
 * Reproductor HLS. Usa la versión ligera de hls.js (sin subtítulos ni DRM) y, en Safari,
 * el soporte nativo del elemento `<video>`. Va pegado al directo: arranca 1,5 s por detrás del
 * último segmento y acelera ligeramente para recuperar si se queda atrás.
 */
import Hls from "hls.js/light";
import { useEffect, useRef } from "react";

const LIVE_CONFIG = {
  liveSyncDuration: 1.5,
  liveMaxLatencyDuration: 4,
  maxLiveSyncPlaybackRate: 1.15,
  backBufferLength: 10,
};

/** Engancha `src` al vídeo y devuelve la función que lo libera. */
const attach = (video: HTMLVideoElement, src: string): (() => void) => {
  if (Hls.isSupported()) {
    const hls = new Hls(LIVE_CONFIG);
    hls.loadSource(src);
    hls.attachMedia(video);
    return () => hls.destroy();
  }
  video.src = src;
  return () => video.removeAttribute("src");
};

/** Vídeo que reproduce la playlist `src` en silencio y sin controles de pausa. */
export const HlsPlayer = ({ src }: { src: string }) => {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => (video.current ? attach(video.current, src) : undefined), [src]);
  return <video ref={video} className="aspect-video h-full w-full bg-navy object-contain" autoPlay muted playsInline />;
};
