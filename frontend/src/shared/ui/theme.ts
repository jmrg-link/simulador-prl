/**
 * Lectura de los tokens de color del tema (`@theme static` en `index.css`) para lo que no se pinta
 * con clases: materiales de three.js y el grafismo en Canvas 2D. Así la paleta vive en un solo sitio.
 */

/** Token de color del tema, sin el prefijo `--color-`. */
export type ThemeColor = "navy" | "navy-soft" | "jet" | "jet-light" | "coupon" | "stock" | "rule" | "carbon" | "carbon-copy";

/** Valor CSS del token, p. ej. `#0d1b3d`. Fuera del navegador devuelve negro. */
export const themeColor = (name: ThemeColor): string =>
  typeof document === "undefined"
    ? "#000000"
    : getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim() || "#000000";
