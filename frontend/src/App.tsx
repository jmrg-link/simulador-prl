/**
 * Raíz de la aplicación: cabecera de la compañía con el recorrido de la sesión y el modo aula.
 */
import { useCallback, useState, type ReactNode } from "react";
import { ClassroomView, type Phase } from "./features/classroom/ClassroomView.tsx";
import { SpectatorView } from "./features/live/SpectatorView.tsx";
import { spectatorStreamId } from "./shared/share-url.ts";

const STAGES = [
  { kind: "briefing", label: "Briefing" },
  { kind: "session", label: "Recorrido" },
  { kind: "debriefing", label: "Evaluación" },
] as const;

/** Marca: visor de gafas en un paralelogramo rojo, a la manera de un emblema de aerolínea. */
const Mark = () => (
  <svg viewBox="0 0 48 28" className="h-7 w-12" aria-hidden>
    <path d="M10 0h38l-10 28H0z" className="fill-jet" />
    <path d="M11 9h24v9h-7l-3-3h-4l-3 3h-7z" className="fill-coupon" />
  </svg>
);

/** Ruta de la sesión como pestañas de billete; la fase actual va rellena. */
const StageRoute = ({ phase }: { phase: Phase["kind"] }) => (
  <ol className="flex items-end gap-1" aria-label="Fases de la sesión">
    {STAGES.map((stage) => (
      <li
        key={stage.kind}
        aria-current={stage.kind === phase ? "step" : undefined}
        className={`tab px-3.5 pt-1.5 pb-1 caps text-xs ${stage.kind === phase ? "bg-stock text-navy" : "bg-white/10 text-white/80"}`}
      >
        {stage.label}
      </li>
    ))}
  </ol>
);

/** Cabecera de la compañía; `children` va a la derecha. */
const Header = ({ children }: { children?: ReactNode }) => (
  <header className="bg-navy text-coupon">
    <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-4 lg:px-10">
      <div className="flex items-center gap-3 pb-3">
        <Mark />
        <p className="display text-3xl tracking-wide">Simulador PRL</p>
      </div>
      {children}
    </div>
    <div className="h-1.5 bg-jet" />
  </header>
);

/** Modo aula a todo el ancho de la ventana. */
const Classroom = () => {
  const [phase, setPhase] = useState<Phase["kind"]>("briefing");
  const onPhase = useCallback((next: Phase) => setPhase(next.kind), []);
  return (
    <>
      <Header>
        <StageRoute phase={phase} />
      </Header>
      <main className="px-6 py-10 lg:px-10">
        <ClassroomView onPhase={onPhase} />
      </main>
    </>
  );
};

/** Aplicación: el directo del espectador en `/directo/<id>` y el modo aula en el resto. */
export const App = () => {
  const streamId = spectatorStreamId();
  if (!streamId) return <Classroom />;
  return (
    <>
      <Header />
      <main className="px-6 py-10 lg:px-10">
        <SpectatorView streamId={streamId} />
      </main>
    </>
  );
};
