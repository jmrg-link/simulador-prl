/**
 * Detección por mirada sostenida: un riesgo cuenta como identificado cuando el centro de la
 * vista permanece sobre él `dwellMs` seguidos. Es la interacción típica de unas gafas sin mandos.
 * Lógica pura, sin three.js, para probarla con tiempos simulados.
 */

/** Resultado de una actualización de la mirada. */
export interface GazeUpdate {
  target: string | null;
  /** Progreso de la mirada sobre `target`, de 0 a 1. */
  progress: number;
  /** Riesgo que acaba de completarse en esta actualización, si alguno. */
  detected?: string;
}

/** Acumula el tiempo de mirada sobre cada objetivo. */
export class GazeTracker {
  readonly #dwellMs: number;
  readonly #done = new Set<string>();
  #target: string | null = null;
  #since = 0;

  /**
   * Crea el detector con el tiempo de mirada sostenida que identifica un riesgo.
   *
   * @param dwellMs - Tiempo de mirada sostenida necesario para identificar un riesgo.
   */
  constructor(dwellMs: number) {
    this.#dwellMs = dwellMs;
  }

  /**
   * Registra hacia qué objetivo mira la vista en `nowMs`. Los ya identificados se ignoran.
   */
  update(target: string | null, nowMs: number): GazeUpdate {
    const effective = target && !this.#done.has(target) ? target : null;
    if (effective !== this.#target) {
      this.#target = effective;
      this.#since = nowMs;
    }
    if (!effective) return { target: null, progress: 0 };
    const progress = Math.min(1, (nowMs - this.#since) / this.#dwellMs);
    if (progress < 1) return { target: effective, progress };
    this.#done.add(effective);
    this.#target = null;
    return { target: effective, progress: 1, detected: effective };
  }
}
