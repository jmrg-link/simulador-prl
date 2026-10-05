/**
 * Veredicto de la prueba en el informe: sello de apto o no apto, en verde o en rojo, y cada
 * criterio del escenario con su resultado, para que se entienda de un vistazo por qué se aprobó o
 * qué faltó.
 */
import type { Scenario, TrainingMetrics } from "../../shared/api/schemas.ts";
import { Icon } from "../../shared/ui/Icon.tsx";
import { Stamp } from "../../shared/ui/Stamp.tsx";

/** Criterio evaluado con su valor obtenido. */
interface CriterionResult {
  label: string;
  value: string;
  met: boolean;
}

/** Evalúa cada criterio del escenario con las métricas finales. */
const evaluateCriteria = (scenario: Scenario, metrics: TrainingMetrics): CriterionResult[] => {
  const high = metrics.hazards.filter((hazard) => hazard.severity === "alta");
  const highResolved = high.filter((hazard) => hazard.detected && hazard.measureCorrect === true).length;
  const criteria: CriterionResult[] = [
    {
      label: `Nota mínima del ${scenario.passCriteria.minScorePercent} %`,
      value: `${metrics.scorePercent} %`,
      met: metrics.scorePercent >= scenario.passCriteria.minScorePercent,
    },
  ];
  if (scenario.passCriteria.requireHighSeverity) {
    criteria.push({
      label: "Riesgos de severidad alta identificados y bien resueltos",
      value: `${highResolved} de ${high.length}`,
      met: highResolved === high.length,
    });
  }
  return criteria;
};

/** Fila de un criterio con su marca de cumplido o no cumplido. */
const CriterionRow = ({ criterion }: { criterion: CriterionResult }) => (
  <li className={`flex items-center gap-3 border-t py-2.5 first:border-t-0 ${criterion.met ? "border-ok/30" : "border-jet/30"}`}>
    <span className={`flex size-7 shrink-0 items-center justify-center text-lg text-coupon ${criterion.met ? "bg-ok" : "bg-jet-deep"}`}>
      <Icon name={criterion.met ? "check" : "cross"} title={criterion.met ? "Cumplido" : "No cumplido"} />
    </span>
    <span className="min-w-0 flex-1 text-body">{criterion.label}</span>
    <span className={`font-mono text-lg tabular-nums ${criterion.met ? "text-ok" : "text-jet-deep"}`}>{criterion.value}</span>
  </li>
);

/** Panel del veredicto con sus criterios. */
export const VerdictPanel = ({ scenario, metrics }: { scenario: Scenario; metrics: TrainingMetrics }) => {
  const passed = metrics.verdict === "apto";
  const criteria = evaluateCriteria(scenario, metrics);
  return (
    <section
      aria-labelledby="veredicto"
      className={`grid gap-6 border-2 p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center ${passed ? "border-ok bg-ok-tint" : "border-jet bg-jet-tint"}`}
    >
      <div className="flex flex-col items-start gap-3">
        <Stamp tone={passed ? "pass" : "void"} size="lg" rotate={-6}>
          {passed ? "Apto" : "No apto"}
        </Stamp>
        <h2 id="veredicto" className={`caps text-lg ${passed ? "text-ok" : "text-jet-deep"}`}>
          {passed ? "Ha superado la prueba" : "No ha superado la prueba"}
        </h2>
      </div>
      <ul className="bg-coupon/70 px-4">
        {criteria.map((criterion) => (
          <CriterionRow key={criterion.label} criterion={criterion} />
        ))}
      </ul>
    </section>
  );
};
