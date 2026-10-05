/**
 * Endpoints de sesiones de formación.
 */
import { requestJson } from "../../shared/api/http.ts";
import {
  metricsSchema,
  recordingSchema,
  scenarioSchema,
  trainingSessionSchema,
  type Recording,
  type Scenario,
  type TrainingMetrics,
  type TrainingSession,
} from "../../shared/api/schemas.ts";

/** Escenario activo con su catálogo de riesgos. */
export const getScenario = (): Promise<Scenario> => requestJson("/api/trainings/scenario", scenarioSchema);

/** Abre una sesión para el alumno. */
export const startTraining = (traineeName: string): Promise<TrainingSession> =>
  requestJson("/api/trainings", trainingSessionSchema, { traineeName });

/** Registra un riesgo identificado y devuelve las métricas resultantes. */
export const recordHazard = (sessionId: string, hazardId: string, reactionMs: number): Promise<TrainingMetrics> =>
  requestJson(`/api/trainings/${sessionId}/hazards`, metricsSchema, { hazardId, reactionMs });

/** Registra la actuación elegida (0, 1 o 2) para un riesgo ya identificado. */
export const decideHazard = (sessionId: string, hazardId: string, option: number): Promise<TrainingMetrics> =>
  requestJson(`/api/trainings/${sessionId}/hazards/${hazardId}/decision`, metricsSchema, { option });

/** Estado y capítulos de la grabación de la sesión. */
export const getRecording = (sessionId: string): Promise<Recording> =>
  requestJson(`/api/recordings/${sessionId}`, recordingSchema);

/** Cierra la sesión y devuelve sus métricas finales. */
export const finishTraining = (sessionId: string): Promise<TrainingMetrics> =>
  requestJson(`/api/trainings/${sessionId}/finish`, metricsSchema, {});

/** URL del SSE de métricas de una sesión. */
export const trainingEventsUrl = (sessionId: string): string => `/api/trainings/${sessionId}/events`;
