/**
 * Esquemas Zod de las respuestas de la API. Validar al recibir convierte un cambio de contrato
 * del backend en un error claro aquí, no en un `undefined` tres componentes más abajo.
 */
import { z } from "zod";

/** Referencia normativa con cita literal. */
export const regulationSchema = z.object({
  reference: z.string(),
  quote: z.string(),
  url: z.url(),
});

/** Riesgo del catálogo del escenario con su ficha didáctica. */
export const hazardSchema = z.object({
  id: z.string(),
  label: z.string(),
  severity: z.enum(["alta", "media"]),
  description: z.string(),
  consequence: z.string(),
  measure: z.string(),
  options: z.tuple([z.string(), z.string(), z.string()]),
  regulation: regulationSchema,
});

/** Escenario con su situación de partida, límites, criterio, marco normativo y riesgos. */
export const scenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  situation: z.string(),
  objective: z.string(),
  timeLimitSeconds: z.number(),
  passCriteria: z.object({ minScorePercent: z.number(), requireHighSeverity: z.boolean() }),
  framework: regulationSchema,
  hazards: z.array(hazardSchema),
});

/** Sesión de formación. */
export const trainingSessionSchema = z.object({
  id: z.string(),
  traineeName: z.string(),
  scenarioId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
});

/** Métricas de una sesión. */
export const metricsSchema = z.object({
  sessionId: z.string(),
  traineeName: z.string(),
  finished: z.boolean(),
  detected: z.number(),
  total: z.number(),
  averageReactionMs: z.number().nullable(),
  durationMs: z.number(),
  scorePercent: z.number(),
  verdict: z.enum(["apto", "no-apto"]).nullable(),
  hazards: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      severity: z.enum(["alta", "media"]),
      detected: z.boolean(),
      reactionMs: z.number().nullable(),
      decided: z.boolean(),
      chosenOption: z.number().nullable(),
      measureCorrect: z.boolean().nullable(),
      correctOption: z.number().nullable(),
    }),
  ),
});

/** Grabación de la sesión con sus capítulos. */
export const recordingSchema = z.object({
  status: z.enum(["RECORDING", "PROCESSING", "READY", "FAILED"]),
  url: z.string().nullable(),
  durationMs: z.number().nullable(),
  chapters: z.array(z.object({ title: z.string(), startMs: z.number(), endMs: z.number() })),
});

/** Emisión RTMP → HLS. */
export const liveStreamSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  status: z.enum(["STARTING", "LIVE", "ENDED"]),
  createdAt: z.string(),
  liveAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  hlsUrl: z.string(),
  ingestPath: z.string(),
});

/** Referencia normativa. */
export type Regulation = z.infer<typeof regulationSchema>;
/** Riesgo del catálogo. */
export type Hazard = z.infer<typeof hazardSchema>;
/** Escenario de formación. */
export type Scenario = z.infer<typeof scenarioSchema>;
/** Sesión de formación. */
export type TrainingSession = z.infer<typeof trainingSessionSchema>;
/** Métricas de una sesión. */
export type TrainingMetrics = z.infer<typeof metricsSchema>;
/** Emisión RTMP → HLS. */
export type LiveStream = z.infer<typeof liveStreamSchema>;
/** Grabación de la sesión. */
export type Recording = z.infer<typeof recordingSchema>;
