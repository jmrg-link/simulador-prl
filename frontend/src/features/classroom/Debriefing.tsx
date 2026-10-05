/**
 * Debriefing: el informe de evaluación. Da el veredicto con su nota, la grabación de la sesión con
 * un capítulo por riesgo y cada riesgo con su ficha completa, la decisión del alumno frente a la
 * correcta y la norma, para que la conversación con el instructor parta de los fallos.
 */
import type { Scenario, TrainingMetrics } from "../../shared/api/schemas.ts";
import { Icon } from "../../shared/ui/Icon.tsx";
import { SectionTitle } from "../../shared/ui/SectionTitle.tsx";
import { formatClock } from "../headset/scene/broadcast-overlay.ts";
import { HazardFicha } from "./HazardCoupon.tsx";
import { SessionRecording } from "./SessionRecording.tsx";
import { VerdictPanel } from "./VerdictPanel.tsx";

/** Casilla de dato del informe. */
const Figure = ({ label, value, figure = false }: { label: string; value: string; figure?: boolean }) => (
  <div className="min-w-0 border-l border-rule px-5 py-3 first:border-l-0">
    <p className="caps text-xs text-navy-soft">{label}</p>
    <p className={`mt-1 break-words ${figure ? "carbon text-4xl" : "caps text-2xl"}`}>{value}</p>
  </div>
);

/** Informe final de la sesión. */
export const Debriefing = ({ scenario, metrics, onRestart }: { scenario: Scenario; metrics: TrainingMetrics; onRestart(): void }) => {
  const byId = new Map(metrics.hazards.map((hazard) => [hazard.id, hazard]));
  const passed = metrics.verdict === "apto";
  const missed = metrics.total - metrics.detected;
  const wrong = metrics.hazards.filter((hazard) => hazard.detected && hazard.measureCorrect !== true).length;

  return (
    <div className="space-y-10">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-4">
          <h1 className="display text-6xl md:text-8xl">
            Informe de
            <br />
            evaluación
          </h1>
          <p className="max-w-measure text-lg leading-relaxed">
            {`${metrics.traineeName} ha obtenido un ${metrics.scorePercent} % de los puntos. `}
            {missed > 0 && `Pasó por alto ${missed} ${missed === 1 ? "riesgo" : "riesgos"}. `}
            {wrong > 0 && `En ${wrong} ${wrong === 1 ? "caso eligió" : "casos eligió"} una actuación incorrecta o no llegó a decidir. `}
            {passed ? "Repasad juntos la norma de cada riesgo." : "Empezad el repaso por los cupones anulados y las decisiones erróneas."}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-2 bg-jet px-6 py-3.5 caps text-base text-white transition-colors hover:bg-jet-deep"
          >
            <Icon name="restart" className="text-xl" /> Nueva formación
          </button>
        </div>
      </header>

      <VerdictPanel scenario={scenario} metrics={metrics} />

      <div className="grid grid-cols-2 bg-coupon shadow-coupon md:grid-cols-5">
        <Figure label="Alumno" value={metrics.traineeName} />
        <Figure figure label="Nota" value={`${metrics.scorePercent} %`} />
        <Figure figure label="Identificados" value={`${metrics.detected}/${metrics.total}`} />
        <Figure figure label="Reacción media" value={metrics.averageReactionMs === null ? "—" : `${(metrics.averageReactionMs / 1000).toFixed(1)} s`} />
        <Figure figure label="Duración" value={formatClock(metrics.durationMs / 1000)} />
      </div>

      <SessionRecording sessionId={metrics.sessionId} />

      <section aria-labelledby="fichas" className="space-y-4">
        <SectionTitle id="fichas">Fichas de riesgo</SectionTitle>
        <ol className="space-y-4">
          {scenario.hazards.map((hazard, index) => {
            const result = byId.get(hazard.id);
            return (
              <HazardFicha
                key={hazard.id}
                hazard={hazard}
                index={index}
                state={result?.detected ? "identificado" : "no-detectado"}
                reactionMs={result?.reactionMs ?? null}
                decision={{ chosen: result?.chosenOption ?? null, correct: result?.correctOption ?? null }}
              />
            );
          })}
        </ol>
        <p className="text-sm text-navy-soft">
          Citas del texto consolidado publicado en boe.es, que el BOE ofrece como informativo y sin valor jurídico. Marco general:{" "}
          <a href={scenario.framework.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {scenario.framework.reference}
          </a>
          .
        </p>
      </section>
    </div>
  );
};
