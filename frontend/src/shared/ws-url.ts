/**
 * URL WebSocket en el mismo origen que la página, para pasar por el proxy de Vite o de nginx.
 */

/** Convierte una ruta en `ws://` o `wss://` según el protocolo de la página. */
export const wsUrl = (path: string): string =>
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${path}`;
