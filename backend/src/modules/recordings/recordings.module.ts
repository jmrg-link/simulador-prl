/**
 * Composición del módulo de grabaciones: servicio, ruta de consulta y estático de los MP4.
 */
import express, { Router, type RequestHandler } from "express";
import { z } from "zod";
import type { TrainingsService } from "../trainings/trainings.service.ts";
import type { RecordingsRepository } from "./recordings.repository.ts";
import { RecordingsService, type RecordingsOptions } from "./recordings.service.ts";

/** Lo que el módulo expone a la aplicación. */
export interface RecordingsModule {
  router: Router;
  filesRouter: Router;
  service: RecordingsService;
}

const params = z.object({ sessionId: z.uuid() });
const FINAL_FILE = /^\/[0-9a-f-]{36}\.mp4$/;

/** Sirve solo los MP4 terminados; los temporales del proceso de grabación no salen. */
const onlyFinalFiles: RequestHandler = (req, res, next) => {
  if (FINAL_FILE.test(req.path)) next();
  else res.sendStatus(404);
};

/** Crea el módulo. Los MP4 se sirven con soporte de Range para poder saltar entre capítulos. */
export const createRecordingsModule = (repository: RecordingsRepository, trainings: TrainingsService, options: RecordingsOptions): RecordingsModule => {
  const service = new RecordingsService(repository, trainings, options);
  const router = Router();
  router.get("/:sessionId", async (req, res) => {
    const { sessionId } = params.parse(req.params);
    res.json(await service.view(sessionId));
  });
  const filesRouter = Router().use(onlyFinalFiles, express.static(options.recordingsDir, { index: false, acceptRanges: true, maxAge: "1h" }));
  return { router, filesRouter, service };
};
