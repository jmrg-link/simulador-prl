/**
 * Marco con botón de pantalla completa (API Fullscreen del navegador). El botón vive en el DOM,
 * fuera del canvas, así que no aparece en la emisión.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon.tsx";

/** Indica si `element` es el que está ahora en pantalla completa. */
const isFullscreen = (element: Element | null): boolean => element !== null && document.fullscreenElement === element;

/** Entra en pantalla completa con `element` o sale si ya lo está. */
const toggleFullscreen = (element: HTMLElement | null): void => {
  if (!element) return;
  if (isFullscreen(element)) void document.exitFullscreen();
  else void element.requestFullscreen();
};

/** Marco 16:9 que pasa a ocupar toda la pantalla, centrando su contenido sobre fondo azul. */
export const FullscreenFrame = ({ children, label }: { children: ReactNode; label: string }) => {
  const frame = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const sync = () => setActive(isFullscreen(frame.current));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  return (
    <div ref={frame} className={`relative bg-navy ${active ? "flex h-screen w-screen items-center justify-center" : "w-full"}`}>
      <div className={active ? "aspect-video max-h-full w-full max-w-[calc(100vh*16/9)]" : "aspect-video w-full"}>{children}</div>
      <button
        type="button"
        onClick={() => toggleFullscreen(frame.current)}
        aria-pressed={active}
        className="absolute right-3 bottom-3 inline-flex items-center gap-2 bg-navy/85 px-3 py-2 caps text-xs text-coupon transition-colors hover:bg-jet"
      >
        <Icon name={active ? "collapse" : "expand"} className="text-base" />
        {active ? "Salir de pantalla completa" : `${label} a pantalla completa`}
      </button>
    </div>
  );
};
