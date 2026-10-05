/**
 * Modo aula: briefing, sesión con alumno e instructor lado a lado y debriefing, en una sola
 * pantalla. Carga el escenario una vez y conduce el paso entre fases.
 */
import { useEffect, useState } from "react";
import type { Scenario, TrainingMetrics, TrainingSession } from "../../shared/api/schemas.ts";
import { getScenario } from "../training/api.ts";
import { Briefing } from "./Briefing.tsx";
import { Debriefing } from "./Debriefing.tsx";
import { SessionDesk } from "./SessionDesk.tsx";

/** Fase del aula. */
export type Phase =
  | { kind: "briefing" }
  | { kind: "session"; session: TrainingSession }
  | { kind: "debriefing"; metrics: TrainingMetrics };

/** Estado de la carga del escenario. */
type ScenarioLoad = { kind: "loading" } | { kind: "ready"; scenario: Scenario } | { kind: "error"; message: string };

/** Vista del modo aula. `onPhase` informa a la cabecera de la fase actual. */
export const ClassroomView = ({ onPhase }: { onPhase(phase: Phase): void }) => {
  const [load, setLoad] = useState<ScenarioLoad>({ kind: "loading" });
  const [phase, setPhase] = useState<Phase>({ kind: "briefing" });

  useEffect(() => {
    getScenario().then(
      (scenario) => setLoad({ kind: "ready", scenario }),
      (error: unknown) => setLoad({ kind: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  }, []);

  useEffect(() => onPhase(phase), [phase, onPhase]);

  if (load.kind === "loading") return <p className="caps text-navy-soft">Cargando el escenario…</p>;
  if (load.kind === "error") {
    return (
      <p role="alert" className="max-w-measure text-jet">
        No se pudo cargar el escenario ({load.message}). Arranca la API con <code className="font-mono">docker compose up</code> en{" "}
        <code className="font-mono">backend/</code> y recarga la página.
      </p>
    );
  }
  const { scenario } = load;
  if (phase.kind === "briefing") return <Briefing scenario={scenario} onStart={(session) => setPhase({ kind: "session", session })} />;
  if (phase.kind === "session") {
    return (
      <SessionDesk
        key={phase.session.id}
        session={phase.session}
        scenario={scenario}
        onFinished={(metrics) => setPhase({ kind: "debriefing", metrics })}
      />
    );
  }
  return <Debriefing scenario={scenario} metrics={phase.metrics} onRestart={() => setPhase({ kind: "briefing" })} />;
};
