/**
 * Persistencia de emisiones con su máquina de estados `STARTING → LIVE → ENDED`.
 * Las transiciones se aplican con un `UPDATE … WHERE status IN (…)`, así que dos eventos
 * concurrentes no pueden dejar una emisión terminada otra vez en directo.
 */
import type { PrismaClient } from "../../shared/database.ts";

/** Estado de una emisión. */
export type LiveStreamStatus = "STARTING" | "LIVE" | "ENDED";

/** Emisión tal como la usa el dominio. */
export interface LiveStream {
  id: string;
  sessionId: string;
  status: LiveStreamStatus;
  createdAt: Date;
  liveAt: Date | null;
  endedAt: Date | null;
}

/** Estados desde los que se puede llegar a cada estado destino. */
export const TRANSITIONS: Record<Exclude<LiveStreamStatus, "STARTING">, LiveStreamStatus[]> = {
  LIVE: ["STARTING"],
  ENDED: ["STARTING", "LIVE"],
};

/** Operaciones de persistencia que necesita el módulo. */
export interface LiveStreamsRepository {
  create(sessionId: string): Promise<LiveStream>;
  findById(id: string): Promise<LiveStream | null>;
  findActiveBySession(sessionId: string): Promise<LiveStream | null>;
  listActive(): Promise<LiveStream[]>;
  /**
   * Aplica la transición a `to` solo si el estado actual lo permite.
   *
   * @returns La emisión actualizada, o `null` si la transición no era válida desde su estado actual.
   */
  transition(id: string, to: keyof typeof TRANSITIONS, at: Date): Promise<LiveStream | null>;
  /** Marca como terminadas las emisiones que un reinicio dejó a medias. */
  endOrphans(at: Date): Promise<number>;
}

const ACTIVE = { status: { in: ["STARTING", "LIVE"] as LiveStreamStatus[] } };

/** Implementación sobre Prisma. */
export const createPrismaLiveStreamsRepository = (db: PrismaClient): LiveStreamsRepository => ({
  create: (sessionId) => db.liveStream.create({ data: { sessionId } }),
  findById: (id) => db.liveStream.findUnique({ where: { id } }),
  findActiveBySession: (sessionId) => db.liveStream.findFirst({ where: { sessionId, ...ACTIVE } }),
  listActive: () => db.liveStream.findMany({ where: ACTIVE, orderBy: { createdAt: "desc" } }),
  transition: async (id, to, at) => {
    const timestamp = to === "LIVE" ? { liveAt: at } : { endedAt: at };
    const { count } = await db.liveStream.updateMany({
      where: { id, status: { in: TRANSITIONS[to] } },
      data: { status: to, ...timestamp },
    });
    return count === 0 ? null : db.liveStream.findUnique({ where: { id } });
  },
  endOrphans: async (at) => {
    const { count } = await db.liveStream.updateMany({ where: ACTIVE, data: { status: "ENDED", endedAt: at } });
    return count;
  },
});
