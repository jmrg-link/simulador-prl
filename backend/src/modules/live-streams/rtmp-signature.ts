/**
 * Firma de URLs RTMP con el esquema `sign=<exp>-<md5>` que valida node-media-server v4
 * (`verifyAuth` en `src/server/broadcast_server.js`). Las URLs caducan para que una filtrada
 * deje de servir.
 */
import { createHash } from "node:crypto";

/** Datos para firmar una URL RTMP. */
export interface SignInput {
  host: string;
  port: number;
  streamPath: string;
  secret: string;
  ttlSeconds: number;
  now?: Date;
}

/**
 * Construye `rtmp://host:port/<app>/<stream>?sign=<exp>-<md5(streamPath-exp-secret)>`,
 * con `exp` en segundos Unix.
 */
export const signRtmpUrl = ({ host, port, streamPath, secret, ttlSeconds, now = new Date() }: SignInput): string => {
  const exp = Math.floor(now.getTime() / 1000) + ttlSeconds;
  const hash = createHash("md5").update(`${streamPath}-${exp}-${secret}`).digest("hex");
  return `rtmp://${host}:${port}${streamPath}?sign=${exp}-${hash}`;
};
