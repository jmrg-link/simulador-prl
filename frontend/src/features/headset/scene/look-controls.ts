/**
 * Simula el giro de cabeza con el ratón (arrastrar) o las flechas del teclado. En unas gafas
 * reales esto lo daría el sensor de orientación del visor.
 */
import { Euler, type Camera } from "three";

/** Orientación de la cabeza en radianes. */
export interface Look {
  yaw: number;
  pitch: number;
}

const POINTER_SENSITIVITY = 0.004;
const KEY_STEP = 0.06;
const MAX_PITCH = 1.2;
const euler = new Euler(0, 0, 0, "YXZ");

/** Limita la inclinación para no dar la vuelta por encima de la cabeza. */
const clampPitch = (pitch: number): number => Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch));

/** Aplica la orientación a la cámara. */
export const applyLook = (camera: Camera, look: Look): void => {
  euler.set(look.pitch, look.yaw, 0);
  camera.quaternion.setFromEuler(euler);
};

/** Variación de orientación por cada flecha del teclado. */
const KEY_DELTAS: Record<string, Look> = {
  ArrowLeft: { yaw: KEY_STEP, pitch: 0 },
  ArrowRight: { yaw: -KEY_STEP, pitch: 0 },
  ArrowUp: { yaw: 0, pitch: KEY_STEP },
  ArrowDown: { yaw: 0, pitch: -KEY_STEP },
};

/** Suma una variación a la orientación respetando el límite de inclinación. */
const turn = (look: Look, delta: Look): void => {
  look.yaw += delta.yaw;
  look.pitch = clampPitch(look.pitch + delta.pitch);
};

/**
 * Engancha arrastre y teclado sobre `element` y muta `look` en sitio.
 *
 * @returns Función que suelta los oyentes.
 */
export const bindLookControls = (element: HTMLElement, look: Look): (() => void) => {
  const onPointerMove = (event: PointerEvent) => {
    if (event.buttons !== 1) return;
    turn(look, { yaw: -event.movementX * POINTER_SENSITIVITY, pitch: -event.movementY * POINTER_SENSITIVITY });
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const delta = KEY_DELTAS[event.key];
    if (!delta) return;
    event.preventDefault();
    turn(look, delta);
  };
  element.addEventListener("pointermove", onPointerMove);
  window.addEventListener("keydown", onKeyDown);
  return () => {
    element.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("keydown", onKeyDown);
  };
};
