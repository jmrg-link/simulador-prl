/**
 * Publicación/suscripción en memoria por clave. Desacopla a quien cambia un estado
 * (un servicio) de quien lo empuja al cliente (una ruta SSE).
 * Vive en un solo proceso: con varias réplicas haría falta un bus compartido.
 */

/** Función que recibe cada valor publicado en la clave suscrita. */
export type Listener<T> = (value: T) => void;

/**
 * Canal de eventos tipado y particionado por clave.
 *
 * @typeParam T - Tipo del valor que se publica.
 */
export class Topic<T> {
  readonly #listeners = new Map<string, Set<Listener<T>>>();

  /**
   * Registra un oyente para `key`.
   *
   * @returns Función que cancela la suscripción.
   */
  subscribe(key: string, listener: Listener<T>): () => void {
    const set = this.#listeners.get(key) ?? new Set<Listener<T>>();
    set.add(listener);
    this.#listeners.set(key, set);
    return () => this.#unsubscribe(key, listener);
  }

  /** Entrega `value` a todos los oyentes de `key`. */
  publish(key: string, value: T): void {
    for (const listener of this.#listeners.get(key) ?? []) listener(value);
  }

  /** Quita el oyente y libera la clave cuando se queda vacía. */
  #unsubscribe(key: string, listener: Listener<T>): void {
    const set = this.#listeners.get(key);
    set?.delete(listener);
    if (set?.size === 0) this.#listeners.delete(key);
  }
}
