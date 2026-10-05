/**
 * Endpoints de emisiones RTMP → HLS.
 */
import { requestJson } from "../../shared/api/http.ts";
import { liveStreamSchema, type LiveStream } from "../../shared/api/schemas.ts";

/** Crea una emisión en `STARTING` para la sesión. */
export const createLiveStream = (sessionId: string): Promise<LiveStream> =>
  requestJson("/api/live-streams", liveStreamSchema, { sessionId });

/** URL del SSE de estado de una emisión. */
export const liveStreamEventsUrl = (id: string): string => `/api/live-streams/${id}/events`;
