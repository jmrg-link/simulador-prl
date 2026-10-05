/**
 * Iconos dibujados para el talonario: trazo de 1,75 px, esquinas rectas y la misma rejilla
 * de 24 px, para que convivan con la rotulación de cupón sin parecer de otra familia.
 */
import type { SVGProps } from "react";

/** Trazos de cada icono dentro de la rejilla de 24 px. */
const PATHS = {
  goggles: "M3 9h18v6.5h-5.5L13 13h-2l-2.5 2.5H3zM1 11h2M21 11h2",
  eye: "M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  drag: "M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3",
  reticle: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 1v4M12 19v4M1 12h4M19 12h4",
  card: "M4 4h16v16H4zM8 9h8M8 13h8M8 17h4",
  signal: "M5 19a10 10 0 0 1 0-14M19 5a10 10 0 0 1 0 14M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M12 12h.01",
  antenna: "M12 10v11M8 21h8M7.8 5.8a6 6 0 0 0 0 8.4M16.2 5.8a6 6 0 0 1 0 8.4M10 8.1a3 3 0 0 0 0 3.8M14 8.1a3 3 0 0 1 0 3.8",
  arrow: "M4 12h15M14 7l5 5-5 5",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  restart: "M4 4v6h6M4.5 15a8 8 0 1 0 1.9-8.3L4 10",
  exit: "M15 4h5v16h-5M10 8l-4 4 4 4M6 12h11",
  check: "M4 12.5l5 5L20 6.5",
  cross: "M6 6l12 12M18 6L6 18",
  expand: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  collapse: "M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5",
  copy: "M8 8h12v12H8zM16 8V4H4v12h4",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
} as const;

/** Nombre de icono disponible. */
export type IconName = keyof typeof PATHS;

/** Icono decorativo; si transmite significado propio, pasa `title`. */
export const Icon = ({ name, title, ...props }: { name: IconName; title?: string } & SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="square"
    strokeLinejoin="miter"
    role={title ? "img" : undefined}
    aria-hidden={title ? undefined : true}
    {...props}
  >
    {title && <title>{title}</title>}
    <path d={PATHS[name]} />
  </svg>
);
