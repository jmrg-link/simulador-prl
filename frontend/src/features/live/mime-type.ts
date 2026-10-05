/**
 * Elección del contenedor y códec de `MediaRecorder`. No hay uno común a todos los navegadores:
 * Firefox solo graba WebM/VP8, Chromium admite WebM y MP4, y Safari prefiere MP4/H.264.
 * FFmpeg acepta cualquiera de los tres en la ingesta.
 */

/** Tipos por orden de preferencia. */
export const CANDIDATE_MIME_TYPES = [
  "video/webm;codecs=vp8",
  "video/webm;codecs=vp9",
  "video/mp4;codecs=avc1",
] as const;

/**
 * Primer tipo soportado, o `undefined` si ninguno lo es.
 *
 * @param isSupported - Por defecto `MediaRecorder.isTypeSupported`; se inyecta en tests.
 */
export const pickMimeType = (
  isSupported: (type: string) => boolean = (type) => MediaRecorder.isTypeSupported(type),
): string | undefined => CANDIDATE_MIME_TYPES.find((type) => isSupported(type));
