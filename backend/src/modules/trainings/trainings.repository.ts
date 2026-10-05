/**
 * Persistencia de sesiones de formación. El servicio depende de la interfaz; la implementación
 * Prisma se inyecta en producción y una en memoria en los tests.
 */
import type { PrismaClient } from "../../shared/database.ts";

/** Sesión de formación tal como la usa el dominio. */
export interface TrainingSession {
  id: string;
  traineeName: string;
  scenarioId: string;
  startedAt: Date;
  endedAt: Date | null;
}

/** Riesgo identificado por el alumno y, si ya decidió, la actuación que eligió. */
export interface HazardEvent {
  hazardId: string;
  reactionMs: number;
  detectedAt: Date;
  chosenOption: number | null;
  measureCorrect: boolean | null;
}

/** Operaciones de persistencia que necesita el módulo. */
export interface TrainingsRepository {
  create(data: { traineeName: string; scenarioId: string }): Promise<TrainingSession>;
  findById(id: string): Promise<TrainingSession | null>;
  listActive(): Promise<TrainingSession[]>;
  finish(id: string, endedAt: Date): Promise<TrainingSession>;
  /**
   * Registra un riesgo identificado en la sesión.
   *
   * @returns `false` si el riesgo ya estaba registrado en esa sesión.
   */
  addHazardEvent(sessionId: string, event: Pick<HazardEvent, "hazardId" | "reactionMs">): Promise<boolean>;
  /**
   * Guarda la actuación elegida para un riesgo ya identificado.
   *
   * @returns `false` si el riesgo no estaba identificado o ya tenía una decisión.
   */
  addDecision(sessionId: string, hazardId: string, chosenOption: number, measureCorrect: boolean): Promise<boolean>;
  listHazardEvents(sessionId: string): Promise<HazardEvent[]>;
}

const UNIQUE_VIOLATION = "P2002";

/** Indica si el error de Prisma es una violación de índice único. */
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;

/** Implementación sobre Prisma. */
export const createPrismaTrainingsRepository = (db: PrismaClient): TrainingsRepository => ({
  create: (data) => db.trainingSession.create({ data }),
  findById: (id) => db.trainingSession.findUnique({ where: { id } }),
  listActive: () => db.trainingSession.findMany({ where: { endedAt: null }, orderBy: { startedAt: "desc" } }),
  finish: (id, endedAt) => db.trainingSession.update({ where: { id }, data: { endedAt } }),
  addHazardEvent: async (sessionId, event) => {
    try {
      await db.hazardEvent.create({ data: { sessionId, ...event } });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  },
  addDecision: async (sessionId, hazardId, chosenOption, measureCorrect) => {
    const { count } = await db.hazardEvent.updateMany({
      where: { sessionId, hazardId, chosenOption: null },
      data: { chosenOption, measureCorrect },
    });
    return count > 0;
  },
  listHazardEvents: (sessionId) =>
    db.hazardEvent.findMany({
      where: { sessionId },
      orderBy: { detectedAt: "asc" },
      select: { hazardId: true, reactionMs: true, detectedAt: true, chosenOption: true, measureCorrect: true },
    }),
});
