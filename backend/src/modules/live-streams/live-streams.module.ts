/**
 * Composición del módulo de emisiones: servidor RTMP, servicio, bus de estado, rutas y gateway.
 */
import type { Router } from "express";
import { Topic } from "../../shared/events/topic.ts";
import type { TrainingsService } from "../trainings/trainings.service.ts";
import { createIngestGateway, type IngestGateway } from "./ingest.gateway.ts";
import type { LiveStreamsRepository } from "./live-streams.repository.ts";
import { createLiveStreamsRouter, createMediaRouter } from "./live-streams.routes.ts";
import { LiveStreamsService, type LiveStreamsOptions, type LiveStreamView } from "./live-streams.service.ts";
import type { MediaServer } from "./media-server.ts";
import type { RecordingsService } from "../recordings/recordings.service.ts";

/** Lo que el módulo expone a la aplicación. */
export interface LiveStreamsModule {
  router: Router;
  mediaRouter: Router;
  gateway: IngestGateway;
  service: LiveStreamsService;
}

/** Dependencias del módulo. */
export interface LiveStreamsModuleDeps {
  repository: LiveStreamsRepository;
  trainings: TrainingsService;
  mediaServer: MediaServer;
  options: LiveStreamsOptions;
  recordings: RecordingsService;
}

/** Crea el módulo con sus dependencias. */
export const createLiveStreamsModule = ({ repository, trainings, mediaServer, options, recordings }: LiveStreamsModuleDeps): LiveStreamsModule => {
  const statusTopic = new Topic<LiveStreamView>();
  const service = new LiveStreamsService(repository, trainings, mediaServer, statusTopic, options, recordings);
  return {
    router: createLiveStreamsRouter(service, statusTopic),
    mediaRouter: createMediaRouter(options.mediaDir),
    gateway: createIngestGateway(service),
    service,
  };
};
