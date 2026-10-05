/**
 * Filtro de los avisos de three.js que no dependen de este proyecto.
 *
 * `@react-three/fiber` 9.8.1 crea un `THREE.Clock` en su store y three 0.186 avisa en el constructor
 * de que Clock está obsoleto. La versión 10 de R3F lo elimina, pero aún no es estable. Mientras
 * tanto se descarta solo ese aviso; el resto de la salida de three se reenvía tal cual.
 */
import { setConsoleFunction } from "three";

/** Prefijos de avisos de three que se descartan, por mensaje exacto para no ocultar otros. */
const SILENCED_WARNINGS = ["THREE.Clock: This module has been deprecated."];

/** Indica si un aviso de three está en la lista de silenciados. */
const isSilenced = (type: "log" | "warn" | "error", message: string): boolean =>
  type === "warn" && SILENCED_WARNINGS.some((prefix) => message.startsWith(prefix));

/** Instala el filtro. Debe llamarse antes de montar cualquier `<Canvas>`. */
export const silenceKnownThreeWarnings = (): void => {
  setConsoleFunction((type, message, ...params) => {
    if (!isSilenced(type, message)) console[type](message, ...params);
  });
};
