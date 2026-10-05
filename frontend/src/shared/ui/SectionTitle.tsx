/**
 * Título de sección del talonario: tres barras rojas inclinadas y rotulación en mayúsculas.
 */
import type { ReactNode } from "react";

/** Marca de tres barras inclinadas que abre cada sección. */
const Slashes = () => (
  <svg viewBox="0 0 22 16" className="h-4 w-5.5 shrink-0 text-jet" aria-hidden>
    <path d="M5 0h3L3 16H0zM12 0h3l-5 16H7zM19 0h3l-5 16h-3z" fill="currentColor" />
  </svg>
);

/** Encabezado de sección con acciones o datos opcionales a la derecha. */
export const SectionTitle = ({ children, aside, id }: { children: string; aside?: ReactNode; id?: string }) => (
  <div className="flex items-end justify-between gap-4 border-b-2 border-navy pb-2">
    <h2 id={id} className="flex items-center gap-2 caps text-lg">
      <Slashes />
      {children}
    </h2>
    {aside}
  </div>
);
