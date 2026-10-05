/**
 * Enruta los `upgrade` HTTP a WebSocket del servidor único de Express según la ruta,
 * tras comprobar el `Origin`. Así señalización e ingesta comparten puerto con la API REST.
 */
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";

/** Un destino de upgrade: la parte de la ruta tras el prefijo llega como `param`. */
export interface UpgradeRoute {
  prefix: string;
  handle(req: IncomingMessage, socket: Duplex, head: Buffer, param: string, url: URL): void;
}

/** Responde con un estado HTTP sobre el socket crudo y lo cierra. */
const reject = (socket: Duplex, status: number, reason: string): void => {
  socket.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
};

/** Busca la ruta cuyo prefijo casa y devuelve el segmento restante, sin barras. */
const match = (routes: UpgradeRoute[], pathname: string): [UpgradeRoute, string] | undefined => {
  const route = routes.find(({ prefix }) => pathname.startsWith(prefix));
  const param = route ? pathname.slice(route.prefix.length).replaceAll("/", "") : "";
  return route && param ? [route, param] : undefined;
};

/**
 * Engancha el enrutado al evento `upgrade` del servidor HTTP. Un `Origin` fuera de la lista
 * recibe 403 y una ruta desconocida 404, ambos antes de completar el handshake.
 */
export const attachUpgradeRouter = (server: Server, allowedOrigins: string[], routes: UpgradeRoute[]): void => {
  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (!allowedOrigins.includes(req.headers.origin ?? "")) return reject(socket, 403, "Forbidden");
    const url = new URL(req.url ?? "/", "http://localhost");
    const found = match(routes, url.pathname);
    if (!found) return reject(socket, 404, "Not Found");
    const [route, param] = found;
    route.handle(req, socket, head, param, url);
  });
};
