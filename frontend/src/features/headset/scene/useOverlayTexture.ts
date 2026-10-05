/**
 * Textura WebGL del grafismo de emisión. Solo se redibuja cuando cambia algo visible (segundo de
 * la cuenta atrás, recuento, tarjeta de decisión) y una vez más cuando terminan de cargar las fuentes.
 */
import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { drawBroadcastOverlay, OVERLAY_SIZE, type OverlayState } from "./broadcast-overlay.ts";

/** Clave que cambia solo cuando cambia algo que se ve. */
const visibleKey = (state: OverlayState): string =>
  [
    Math.ceil(state.remainingS),
    state.detected,
    state.immersive,
    state.recording,
    state.card?.label ?? "",
    state.card?.chosen ?? "",
    state.traineeName,
  ].join("|");

/** Lienzo 2D del grafismo con su textura y la memoria del último dibujo. */
class OverlaySurface {
  readonly texture: CanvasTexture;
  readonly #ctx: CanvasRenderingContext2D;
  #lastKey = "";

  /**
   * Crea el lienzo 2D del grafismo y la textura WebGL que lo muestra.
   *
   * @throws Error si el navegador no ofrece Canvas 2D.
   */
  constructor() {
    const canvas = document.createElement("canvas");
    canvas.width = OVERLAY_SIZE.width;
    canvas.height = OVERLAY_SIZE.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D no disponible");
    this.#ctx = ctx;
    this.texture = new CanvasTexture(canvas);
    this.texture.colorSpace = SRGBColorSpace;
  }

  /** Redibuja si el estado visible cambió desde la última vez. */
  draw(state: OverlayState): void {
    const key = visibleKey(state);
    if (key === this.#lastKey) return;
    this.#lastKey = key;
    drawBroadcastOverlay(this.#ctx, state);
    this.texture.needsUpdate = true;
  }

  /** Fuerza el siguiente dibujo, p. ej. cuando ya han cargado las fuentes. */
  invalidate(): void {
    this.#lastKey = "";
  }

  /** Libera la textura en la GPU. */
  dispose(): void {
    this.texture.dispose();
  }
}

/** Devuelve la superficie del grafismo, que se libera al desmontar. */
export const useOverlayTexture = (): OverlaySurface => {
  const surface = useMemo(() => new OverlaySurface(), []);
  useEffect(() => {
    void document.fonts.ready.then(() => surface.invalidate());
    return () => surface.dispose();
  }, [surface]);
  return surface;
};
