/**
 * Enlaces públicos que se comparten con espectadores en otros equipos.
 */

/** Origen en la red local que inyecta Vite en desarrollo; `null` tras nginx o sin red. */
declare const __LAN_ORIGIN__: string | null;

/** Prefijo de la ruta del espectador del directo. */
export const SPECTATOR_PATH = "/directo/";

/**
 * Origen alcanzable desde otro equipo. Si la página se abrió por `localhost`, se sustituye por la
 * IP de la red local, porque `localhost` en el otro equipo apuntaría a él mismo.
 */
const shareableOrigin = (): string => {
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  const lan = typeof __LAN_ORIGIN__ === "string" ? __LAN_ORIGIN__ : null;
  return isLocal && lan ? lan : location.origin;
};

/** URL de la página del espectador para una emisión. */
export const spectatorUrl = (streamId: string): string => `${shareableOrigin()}${SPECTATOR_PATH}${streamId}`;

/** Id de emisión si la página actual es la del espectador. */
export const spectatorStreamId = (): string | null =>
  location.pathname.startsWith(SPECTATOR_PATH) ? location.pathname.slice(SPECTATOR_PATH.length).split("/")[0] || null : null;
