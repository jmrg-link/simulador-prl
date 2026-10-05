import { randomUUID } from "node:crypto";
import type {
  HazardEvent,
  TrainingSession,
  TrainingsRepository,
} from "../../src/modules/trainings/trainings.repository.ts";

/** Repositorio en memoria con la misma semántica que el de Prisma, incluido el único (sesión, riesgo). */
export const createInMemoryTrainingsRepository = (): TrainingsRepository => {
  const sessions = new Map<string, TrainingSession>();
  const events = new Map<string, HazardEvent[]>();
  return {
    create: async (data) => {
      const session = { id: randomUUID(), ...data, startedAt: new Date(), endedAt: null };
      sessions.set(session.id, session);
      return session;
    },
    findById: async (id) => sessions.get(id) ?? null,
    listActive: async () => [...sessions.values()].filter((session) => !session.endedAt),
    finish: async (id, endedAt) => {
      const session = { ...sessions.get(id)!, endedAt };
      sessions.set(id, session);
      return session;
    },
    addHazardEvent: async (sessionId, event) => {
      const list = events.get(sessionId) ?? [];
      if (list.some(({ hazardId }) => hazardId === event.hazardId)) return false;
      events.set(sessionId, [...list, { ...event, detectedAt: new Date(), chosenOption: null, measureCorrect: null }]);
      return true;
    },
    addDecision: async (sessionId, hazardId, chosenOption, measureCorrect) => {
      const event = events.get(sessionId)?.find((candidate) => candidate.hazardId === hazardId);
      if (!event || event.chosenOption !== null) return false;
      Object.assign(event, { chosenOption, measureCorrect });
      return true;
    },
    listHazardEvents: async (sessionId) => events.get(sessionId) ?? [],
  };
};
