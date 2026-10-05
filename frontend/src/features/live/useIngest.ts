/**
 * Estado de la ingesta RTMP para un botón de «emitir / parar».
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { startIngest, type IngestHandle } from "./IngestPublisher.ts";

/** Estado de la ingesta. */
export type IngestState =
  | { kind: "parada"; message?: string }
  | { kind: "arrancando" }
  | { kind: "emitiendo"; streamId: string };

/** Controles y estado de la ingesta de `stream` para `sessionId`. Se detiene al desmontar. */
export const useIngest = (stream: MediaStream | null, sessionId: string) => {
  const [state, setState] = useState<IngestState>({ kind: "parada" });
  const handle = useRef<IngestHandle | null>(null);

  const start = useCallback(async () => {
    if (!stream || handle.current) return;
    setState({ kind: "arrancando" });
    try {
      handle.current = await startIngest(stream, sessionId, (message) => {
        handle.current = null;
        setState({ kind: "parada", message });
      });
      setState({ kind: "emitiendo", streamId: handle.current.streamId });
    } catch (error) {
      setState({ kind: "parada", message: error instanceof Error ? error.message : String(error) });
    }
  }, [stream, sessionId]);

  const stop = useCallback(() => handle.current?.stop(), []);

  useEffect(() => () => handle.current?.stop(), []);

  return { state, start, stop };
};
