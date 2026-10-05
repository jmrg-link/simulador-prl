/**
 * Conecta un `Viewer` al ciclo de vida de React.
 */
import { useEffect, useState } from "react";
import { Viewer, type ViewerStatus } from "./Viewer.ts";

/** Stream recibido y estado de la conexión. */
export interface ViewerState {
  stream: MediaStream | null;
  status: ViewerStatus;
}

/** Recibe la emisión WebRTC de la sala `roomId` mientras el componente esté montado. */
export const useViewer = (roomId: string): ViewerState => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<ViewerStatus>("conectando");
  useEffect(() => {
    const viewer = new Viewer(roomId, { onStream: setStream, onStatus: setStatus });
    return () => viewer.stop();
  }, [roomId]);
  return { stream, status };
};
