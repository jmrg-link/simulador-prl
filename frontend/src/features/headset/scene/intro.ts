/**
 * Secuencia de entrada en tercera persona: el alumno sostiene las gafas, se las sube a la cara y
 * la cámara entra en su cabeza. Funciones puras del tiempo transcurrido para que la animación
 * sea determinista y no dependa de la tasa de fotogramas.
 */
import { Quaternion, Vector3, type Camera, type Object3D } from "three";

/** Altura de los ojos del operario modelado en Blender, en metros. */
export const EYE_HEIGHT = 1.65;

const HOLD_S = 1.2;
const LIFT_S = 2;
const DOLLY_S = 1.8;

/** Duración total de la secuencia, en segundos. */
export const INTRO_DURATION_S = HOLD_S + LIFT_S + DOLLY_S;

const GOGGLES_IN_HAND = new Vector3(0.28, 1.05, -0.35);
const GOGGLES_ON_FACE = new Vector3(0, EYE_HEIGHT, -0.13);
const THIRD_PERSON = new Vector3(2.2, 2.1, 2.6);
const EYE = new Vector3(0, EYE_HEIGHT, 0);
const LOOK_AT_TRAINEE = new Vector3(0, 1.4, 0);
const LOOK_FORWARD = new Quaternion();

/** Curva suave de 0 a 1 para acelerar y frenar cada tramo. */
const ease = (t: number): number => {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
};

/** Orientación de la cámara en tercera persona mirando al avatar. */
const thirdPersonQuaternion = (camera: Camera): Quaternion => {
  camera.position.copy(THIRD_PERSON);
  camera.lookAt(LOOK_AT_TRAINEE);
  return camera.quaternion.clone();
};

/** Posa de la escena en el instante `elapsedS` de la secuencia. */
export interface IntroPose {
  /** Progreso del tramo en que la cámara entra en la cabeza, de 0 a 1. */
  dolly: number;
}

/** Coloca gafas y cámara para el instante `elapsedS` y devuelve el progreso del acercamiento. */
export const poseIntro = (elapsedS: number, camera: Camera, goggles: Object3D | null): IntroPose => {
  const lift = ease((elapsedS - HOLD_S) / LIFT_S);
  const dolly = ease((elapsedS - HOLD_S - LIFT_S) / DOLLY_S);
  goggles?.position.lerpVectors(GOGGLES_IN_HAND, GOGGLES_ON_FACE, lift);
  const start = thirdPersonQuaternion(camera);
  camera.position.lerpVectors(THIRD_PERSON, EYE, dolly);
  camera.quaternion.slerpQuaternions(start, LOOK_FORWARD, dolly);
  return { dolly };
};
