/**
 * Código de cupón de un riesgo, compartido por el talonario y el grafismo de emisión.
 */

/** Código del cupón por su posición en el catálogo, p. ej. `R-01`. */
export const couponCode = (index: number): string => `R-${String(index + 1).padStart(2, "0")}`;
