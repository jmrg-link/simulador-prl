/**
 * Textura generada con Canvas 2D para el HUD de las gafas: la viñeta de la lente.
 * Se dibuja dentro de la escena WebGL para que viaje en el vídeo emitido, igual que el
 * «modo espejo» de unas gafas reales.
 */
import { CanvasTexture, SRGBColorSpace } from "three";

/** Crea un canvas 2D del tamaño indicado y devuelve su contexto. */
const context2d = (width: number, height: number): CanvasRenderingContext2D => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  return ctx;
};

/** Viñeta circular: centro transparente y borde negro, como el campo de visión de una lente. */
export const createLensVignette = (): CanvasTexture => {
  const size = 512;
  const ctx = context2d(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.5);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.75, "rgba(0,0,0,0.55)");
  gradient.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(ctx.canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

