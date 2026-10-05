/**
 * Cliente WebSocket de señalización: valida lo que llega, serializa lo que sale y reconecta
 * con espera creciente si la conexión se cae sin que la cerremos nosotros.
 */
import { wsUrl } from "../ws-url.ts";
import { serverMessageSchema, type ClientMessage, type Role, type ServerMessage } from "./messages.ts";

const MAX_RETRY_MS = 8_000;
const CLOSE_ROOM_TAKEN = 4409;

/** Oyentes del cliente de señalización. */
export interface SignalingHandlers {
  onMessage(message: ServerMessage): void;
  /** Se invoca si el servidor rechaza la entrada (p. ej. sala con emisor); no se reintenta. */
  onRejected?(reason: string): void;
}

/** Conexión de señalización a una sala con un papel fijo. */
export class SignalingClient {
  readonly #path: string;
  readonly #handlers: SignalingHandlers;
  #socket: WebSocket | undefined;
  #retryMs = 500;
  #closed = false;

  /**
   * Abre la conexión de inmediato.
   *
   * @param roomId - Sala; es el id de la sesión de formación.
   * @param role - Papel en la sala.
   * @param handlers - Oyentes de mensajes y rechazo.
   */
  constructor(roomId: string, role: Role, handlers: SignalingHandlers) {
    this.#path = `/ws/signaling/${encodeURIComponent(roomId)}?role=${role}`;
    this.#handlers = handlers;
    this.#connect();
  }

  /** Envía un mensaje si la conexión está abierta; si no, lo descarta. */
  send(message: ClientMessage): void {
    if (this.#socket?.readyState === WebSocket.OPEN) this.#socket.send(JSON.stringify(message));
  }

  /**
   * Cierra la conexión y desactiva la reconexión. Si el socket aún se está conectando, espera a que
   * abra para cerrarlo limpio: cerrarlo a medio saludo hace que el navegador y el proxy de Vite
   * registren un error, algo que en desarrollo pasa en cada doble montaje de React.
   */
  close(): void {
    this.#closed = true;
    const socket = this.#socket;
    if (socket?.readyState === WebSocket.CONNECTING) socket.onopen = () => socket.close(1000);
    else socket?.close(1000);
  }

  /** Abre el socket y engancha los oyentes. */
  #connect(): void {
    const socket = new WebSocket(wsUrl(this.#path));
    this.#socket = socket;
    socket.onopen = () => (this.#retryMs = 500);
    socket.onmessage = (event: MessageEvent<string>) => this.#dispatch(event.data);
    socket.onclose = (event) => this.#onClose(event);
  }

  /** Valida y entrega un mensaje entrante; tras `close()` ya no entrega nada. */
  #dispatch(raw: string): void {
    if (this.#closed) return;
    const parsed = serverMessageSchema.safeParse(JSON.parse(raw));
    if (parsed.success) this.#handlers.onMessage(parsed.data);
  }

  /** Reintenta con espera exponencial salvo cierre voluntario o rechazo del servidor. */
  #onClose(event: CloseEvent): void {
    if (this.#closed) return;
    if (event.code === CLOSE_ROOM_TAKEN || event.code === 1008) {
      this.#handlers.onRejected?.(event.reason);
      return;
    }
    setTimeout(() => {
      if (!this.#closed) this.#connect();
    }, this.#retryMs);
    this.#retryMs = Math.min(this.#retryMs * 2, MAX_RETRY_MS);
  }
}
