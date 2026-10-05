/**
 * Cálculo de las métricas y la nota de una sesión de formación. Función pura: no toca la base.
 *
 * Cada riesgo vale dos puntos: uno por identificarlo y otro por elegir la actuación correcta.
 * El veredicto solo se emite con la sesión cerrada y aplica el criterio del escenario.
 */
import type { Scenario } from "./scenario.ts";
import type { HazardEvent, TrainingSession } from "./trainings.repository.ts";

/** Resultado de la prueba: apto, no apto o pendiente mientras la sesión siga abierta. */
export type Verdict = "apto" | "no-apto" | null;

/**
 * Estado de un riesgo en las métricas. Mientras la sesión sigue abierta solo consta si el alumno
 * decidió; la opción elegida, si acertó y la correcta se revelan al cerrar, porque en el modo aula
 * el alumno ve la misma pantalla que el instructor.
 */
export interface HazardMetrics {
  id: string;
  label: string;
  severity: "alta" | "media";
  detected: boolean;
  reactionMs: number | null;
  decided: boolean;
  chosenOption: number | null;
  measureCorrect: boolean | null;
  correctOption: number | null;
}

/** Métricas de una sesión que consumen el panel del instructor y el informe. */
export interface TrainingMetrics {
  sessionId: string;
  traineeName: string;
  finished: boolean;
  detected: number;
  total: number;
  averageReactionMs: number | null;
  durationMs: number;
  scorePercent: number;
  verdict: Verdict;
  hazards: HazardMetrics[];
}

/** Media aritmética redondeada; `null` si no hay valores. */
const average = (values: number[]): number | null =>
  values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

/** Puntos de un riesgo: identificarlo y acertar la actuación. */
const points = (event: HazardEvent | undefined): number => (event ? 1 + Number(event.measureCorrect === true) : 0);

/** Aplica el criterio de superación del escenario a una sesión cerrada. */
const verdictOf = (scenario: Scenario, byHazard: Map<string, HazardEvent>, scorePercent: number): Exclude<Verdict, null> => {
  const highOk = scenario.hazards.every((hazard) => hazard.severity !== "alta" || byHazard.get(hazard.id)?.measureCorrect === true);
  const passes = scorePercent >= scenario.passCriteria.minScorePercent && (!scenario.passCriteria.requireHighSeverity || highOk);
  return passes ? "apto" : "no-apto";
};

/**
 * Combina sesión, eventos y catálogo en las métricas y la nota.
 *
 * @param now - Instante de referencia para la duración de una sesión aún abierta.
 */
export const computeMetrics = (
  session: TrainingSession,
  events: HazardEvent[],
  scenario: Scenario,
  now: Date = new Date(),
): TrainingMetrics => {
  const finished = session.endedAt !== null;
  const byHazard = new Map(events.map((event) => [event.hazardId, event]));
  const hazards: HazardMetrics[] = scenario.hazards.map(({ id, label, severity, correctOption }) => {
    const event = byHazard.get(id);
    return {
      id,
      label,
      severity,
      detected: event !== undefined,
      reactionMs: event?.reactionMs ?? null,
      decided: event?.chosenOption !== null && event?.chosenOption !== undefined,
      chosenOption: finished ? (event?.chosenOption ?? null) : null,
      measureCorrect: finished ? (event?.measureCorrect ?? null) : null,
      correctOption: finished ? correctOption : null,
    };
  });
  const earned = scenario.hazards.reduce((sum, { id }) => sum + points(byHazard.get(id)), 0);
  const scorePercent = Math.round((earned / (scenario.hazards.length * 2)) * 100);
  return {
    sessionId: session.id,
    traineeName: session.traineeName,
    finished,
    detected: byHazard.size,
    total: scenario.hazards.length,
    averageReactionMs: average(events.map(({ reactionMs }) => reactionMs)),
    durationMs: (session.endedAt ?? now).getTime() - session.startedAt.getTime(),
    scorePercent: finished ? scorePercent : 0,
    verdict: finished ? verdictOf(scenario, byHazard, scorePercent) : null,
    hazards,
  };
};
