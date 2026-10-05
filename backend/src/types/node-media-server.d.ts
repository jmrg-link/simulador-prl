/**
 * Tipos mínimos de node-media-server 4.4.3, que se publica en CommonJS sin declaraciones.
 * Cubren solo lo que usa `media-server.ts`; la forma sale de `src/index.js` y `src/core/context.js`.
 */
declare module "node-media-server" {
  /** Sesión RTMP o FLV que NMS pasa a cada oyente de evento. */
  export interface NmsSession {
    id: string;
    ip: string;
    streamApp: string;
    streamName: string;
    streamPath: string;
    streamQuery: Record<string, string>;
    close(): void;
  }

  /** Subconjunto de la configuración v4 que se usa aquí. */
  export interface NmsConfig {
    bind?: string;
    rtmp?: { port: number };
    auth?: { play?: boolean; publish?: boolean; secret?: string };
    record?: { auto?: boolean; path?: string };
    store?: { path?: string };
    webadmin?: { enable?: boolean };
  }

  /** Nombres de evento que emite NMS. */
  export type NmsEvent = "prePublish" | "postPublish" | "donePublish" | "prePlay" | "postPlay" | "donePlay";

  /** Servidor de medios embebible. */
  export default class NodeMediaServer {
    /** Guarda la configuración en el contexto global de NMS y prepara los servidores. */
    constructor(config: NmsConfig, configPath?: string);
    /** Registra un oyente de evento; el valor que devuelva se ignora. */
    on(event: NmsEvent, listener: (session: NmsSession) => void): void;
    /** Abre los puertos configurados. */
    run(): Promise<void>;
    /** Cierra los servidores y vuelca el almacén; idempotente. */
    stop(): Promise<void>;
  }
}

declare module "node-media-server/src/core/logger.js" {
  /** Logger global de NMS; su nivel se ajusta tras construir el servidor. */
  const logger: { level: "trace" | "debug" | "info" | "warn" | "error" };
  export default logger;
}
