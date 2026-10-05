/**
 * Rutas REST y SSE de `/api/trainings`. Validan la entrada con Zod y delegan en el servicio.
 */
import { Router } from "express";
import { z } from "zod";
import type { Topic } from "../../shared/events/topic.ts";
import { openSse } from "../../shared/http/sse.ts";
import type { TrainingMetrics } from "./metrics.ts";
import type { TrainingsService } from "./trainings.service.ts";

const startBody = z.object({ traineeName: z.string().trim().min(1).max(80) });
const hazardBody = z.object({ hazardId: z.string().min(1), reactionMs: z.number().int().nonnegative() });
const idParams = z.object({ id: z.uuid() });
const decisionParams = z.object({ id: z.uuid(), hazardId: z.string().min(1) });
const decisionBody = z.object({ option: z.number().int().min(0).max(2) });

/** Construye el router del módulo. */
export const createTrainingsRouter = (service: TrainingsService, metricsTopic: Topic<TrainingMetrics>): Router => {
  const router = Router();

  router.get("/scenario", (_req, res) => {
    res.json(service.scenario());
  });

  router.get("/", async (_req, res) => {
    res.json(await service.listActive());
  });

  router.post("/", async (req, res) => {
    const { traineeName } = startBody.parse(req.body);
    res.status(201).json(await service.start(traineeName));
  });

  router.get("/:id/metrics", async (req, res) => {
    const { id } = idParams.parse(req.params);
    res.json(await service.metrics(id));
  });

  router.post("/:id/hazards", async (req, res) => {
    const { id } = idParams.parse(req.params);
    const { hazardId, reactionMs } = hazardBody.parse(req.body);
    res.status(201).json(await service.recordHazard(id, hazardId, reactionMs));
  });

  router.post("/:id/hazards/:hazardId/decision", async (req, res) => {
    const { id, hazardId } = decisionParams.parse(req.params);
    const { option } = decisionBody.parse(req.body);
    res.status(201).json(await service.decide(id, hazardId, option));
  });

  router.post("/:id/finish", async (req, res) => {
    const { id } = idParams.parse(req.params);
    res.json(await service.finish(id));
  });

  router.get("/:id/events", async (req, res) => {
    const { id } = idParams.parse(req.params);
    const initial = await service.metrics(id);
    let unsubscribe = (): void => undefined;
    const channel = openSse(req, res, () => unsubscribe());
    channel.send(initial);
    unsubscribe = metricsTopic.subscribe(id, (metrics) => channel.send(metrics));
  });

  return router;
};
