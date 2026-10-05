/**
 * Conecta un `Broadcaster` al ciclo de vida de React.
 */
import { useEffect, useState } from "react";
import { Broadcaster } from "./Broadcaster.ts";

/** Estado del emisor que muestra la interfaz. */
export interface BroadcastState {
  viewers: number;
  rejected: string | null;
}

/**
 * Emite `stream` en la sala `roomId` mientras ambos existan y el componente esté montado.
 */
export const useBroadcaster = (stream: MediaStream | null, roomId: string | null): BroadcastState => {
  const [state, setState] = useState<BroadcastState>({ viewers: 0, rejected: null });
  useEffect(() => {
    if (!stream || !roomId) return;
    const broadcaster = new Broadcaster(
      stream,
      roomId,
      (viewers) => setState((previous) => ({ ...previous, viewers })),
      (rejected) => setState((previous) => ({ ...previous, rejected })),
    );
    return () => broadcaster.stop();
  }, [stream, roomId]);
  return state;
};
