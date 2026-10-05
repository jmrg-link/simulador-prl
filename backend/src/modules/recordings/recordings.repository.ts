/**
 * Persistencia de las grabaciones de sesión. El servicio depende de la interfaz; la
 * implementación Prisma se inyecta en producción.
 */
import type { PrismaClient } from "../../shared/database.ts";

/** Estado de una grabación. */
export type RecordingStatus = "RECORDING" | "PROCESSING" | "READY" | "FAILED";

/** Grabación tal como la usa el dominio. */
export interface Recording {
  sessionId: string;
  status: RecordingStatus;
  startedAt: Date;
  durationMs: number | null;
}

/** Operaciones de persistencia que necesita el módulo. */
export interface RecordingsRepository {
  /**
   * Crea la grabación de una sesión en `RECORDING`.
   *
   * @returns `null` si la sesión ya tenía grabación.
   */
  start(sessionId: string, startedAt: Date): Promise<Recording | null>;
  findBySession(sessionId: string): Promise<Recording | null>;
  update(sessionId: string, data: Partial<Pick<Recording, "status" | "durationMs">>): Promise<Recording>;
  /** Marca como fallidas las grabaciones que un reinicio dejó a medias. */
  failOrphans(): Promise<number>;
}

const UNIQUE_VIOLATION = "P2002";

/** Indica si el error de Prisma es una violación de índice único. */
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;

const FIELDS = { sessionId: true, status: true, startedAt: true, durationMs: true } as const;

/** Implementación sobre Prisma. */
export const createPrismaRecordingsRepository = (db: PrismaClient): RecordingsRepository => ({
  start: async (sessionId, startedAt) => {
    try {
      return await db.recording.create({ data: { sessionId, startedAt }, select: FIELDS });
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  },
  findBySession: (sessionId) => db.recording.findUnique({ where: { sessionId }, select: FIELDS }),
  update: (sessionId, data) => db.recording.update({ where: { sessionId }, data, select: FIELDS }),
  failOrphans: async () => {
    const { count } = await db.recording.updateMany({
      where: { status: { in: ["RECORDING", "PROCESSING"] } },
      data: { status: "FAILED" },
    });
    return count;
  },
});
