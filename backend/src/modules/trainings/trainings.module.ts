/**
 * Composición del módulo de formaciones: une repositorio, servicio, bus de métricas y rutas.
 * Es el equivalente a un `@Module` de NestJS sin contenedor de inyección.
 */
import type { Router } from "express";
import { Topic } from "../../shared/events/topic.ts";
import type { TrainingMetrics } from "./metrics.ts";
import { WORKSHOP_SCENARIO } from "./scenario.ts";
import type { TrainingsRepository } from "./trainings.repository.ts";
import { createTrainingsRouter } from "./trainings.routes.ts";
import { TrainingsService } from "./trainings.service.ts";

/** Lo que el módulo expone a la aplicación. */
export interface TrainingsModule {
  router: Router;
  service: TrainingsService;
}

/** Crea el módulo sobre el repositorio indicado. */
export const createTrainingsModule = (repository: TrainingsRepository): TrainingsModule => {
  const metricsTopic = new Topic<TrainingMetrics>();
  const service = new TrainingsService(repository, WORKSHOP_SCENARIO, metricsTopic);
  return { router: createTrainingsRouter(service, metricsTopic), service };
};
