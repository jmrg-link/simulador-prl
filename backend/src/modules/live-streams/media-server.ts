/**
 * Servidor RTMP embebido (node-media-server v4) que recibe la ingesta y la sirve al empaquetador
 * HLS. Escucha solo en loopback y exige URLs firmadas tanto para publicar como para leer.
 */
import NodeMediaServer from "node-media-server";
import nmsLogger from "node-media-server/src/core/logger.js";

/** Opciones del servidor RTMP. */
export interface MediaServerOptions {
  port: number;
  secret: string;
  storeDir: string;
}

/** Servidor RTMP en marcha. */
export interface MediaServer {
  /** Registra un oyente que recibe el `streamName` de cada publicación aceptada en la app `live`. */
  onPublish(listener: (streamName: string) => void): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/** Aplicación RTMP bajo la que se publican las emisiones: `rtmp://host/live/<id>`. */
export const RTMP_APP = "live";

/** Crea el servidor RTMP sin HTTP, sin consola web y sin grabación automática. */
export const createMediaServer = ({ port, secret, storeDir }: MediaServerOptions): MediaServer => {
  const nms = new NodeMediaServer({
    bind: "127.0.0.1",
    rtmp: { port },
    auth: { publish: true, play: true, secret },
    record: { auto: false },
    store: { path: storeDir },
    webadmin: { enable: false },
  });
  nmsLogger.level = "warn";
  return {
    onPublish: (listener) =>
      nms.on("postPublish", (session) => {
        if (session.streamApp === RTMP_APP) listener(session.streamName);
      }),
    start: () => nms.run(),
    stop: () => nms.stop(),
  };
};
