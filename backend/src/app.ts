/**
 * Aplicación Express sin efectos: recibe los routers ya compuestos y no abre puertos,
 * para que los tests la levanten sobre un servidor efímero.
 */
import express, { type Express, type Router } from "express";
import { errorHandler } from "./shared/http/error-handler.ts";

/** Routers que monta la aplicación. `media` es opcional porque sin FFmpeg no hay HLS que servir. */
export interface AppRouters {
  trainings: Router;
  liveStreams?: Router;
  media?: Router;
  recordings?: Router;
  recordingFiles?: Router;
}

/** Monta JSON, salud, rutas de módulos y el manejador de errores. */
export const createApp = ({ trainings, liveStreams, media, recordings, recordingFiles }: AppRouters): Express => {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/trainings", trainings);
  if (liveStreams) app.use("/api/live-streams", liveStreams);
  if (media) app.use("/media", media);
  if (recordings) app.use("/api/recordings", recordings);
  if (recordingFiles) app.use("/recordings", recordingFiles);
  app.use(errorHandler);
  return app;
};
