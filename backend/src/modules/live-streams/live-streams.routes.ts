/**
 * Rutas de `/api/live-streams` (REST + SSE de estado) y el estático `/media` con el HLS.
 */
import express, { Router, type RequestHandler, type Response } from "express";
import { z } from "zod";
import type { Topic } from "../../shared/events/topic.ts";
import { openSse } from "../../shared/http/sse.ts";
import type { LiveStreamView, LiveStreamsService } from "./live-streams.service.ts";

const createBody = z.object({ sessionId: z.uuid() });
const idParams = z.object({ id: z.uuid() });

/** Construye el router REST/SSE del módulo. */
export const createLiveStreamsRouter = (service: LiveStreamsService, statusTopic: Topic<LiveStreamView>): Router => {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.json(await service.listActive());
  });

  router.post("/", async (req, res) => {
    const { sessionId } = createBody.parse(req.body);
    res.status(201).json(await service.create(sessionId));
  });

  router.get("/:id/events", async (req, res) => {
    const { id } = idParams.parse(req.params);
    const initial = await service.get(id);
    let unsubscribe = (): void => undefined;
    const channel = openSse(req, res, () => unsubscribe());
    channel.send(initial);
    if (initial.status === "ENDED") return channel.close();
    unsubscribe = statusTopic.subscribe(id, (view) => {
      channel.send(view);
      if (view.status === "ENDED") channel.close();
    });
  });

  return router;
};

/**
 * Caché por tipo: la playlist cambia cada segmento, así que vive un segundo; un segmento no
 * cambia nunca una vez escrito, así que es inmutable.
 */
const setHlsCacheHeaders = (res: Response, path: string): void => {
  if (path.endsWith(".m3u8")) res.setHeader("Cache-Control", "public, max-age=1");
  else if (path.endsWith(".ts")) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
};

/** Oculta los `.tmp` que FFmpeg escribe antes de renombrar cada fichero. */
const hideTempFiles: RequestHandler = (req, res, next) => {
  if (req.path.endsWith(".tmp")) res.sendStatus(404);
  else next();
};

/** Router estático del HLS escrito en `mediaDir`. */
export const createMediaRouter = (mediaDir: string): Router =>
  Router().use(hideTempFiles, express.static(mediaDir, { setHeaders: setHlsCacheHeaders, index: false }));
