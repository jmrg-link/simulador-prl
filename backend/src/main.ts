/**
 * Punto de entrada: compone los módulos, abre HTTP + WebSocket en un mismo puerto, arranca el
 * servidor RTMP y apaga todo en orden ante SIGINT/SIGTERM.
 */
import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createLiveStreamsModule } from "./modules/live-streams/live-streams.module.ts";
import { createPrismaLiveStreamsRepository } from "./modules/live-streams/live-streams.repository.ts";
import { createMediaServer } from "./modules/live-streams/media-server.ts";
import { createRecordingsModule } from "./modules/recordings/recordings.module.ts";
import { createPrismaRecordingsRepository } from "./modules/recordings/recordings.repository.ts";
import { createSignalingModule } from "./modules/signaling/signaling.module.ts";
import { createTrainingsModule } from "./modules/trainings/trainings.module.ts";
import { createPrismaTrainingsRepository } from "./modules/trainings/trainings.repository.ts";
import { createDatabase } from "./shared/database.ts";
import { attachUpgradeRouter } from "./shared/ws/upgrade-router.ts";

const config = loadConfig();
const db = createDatabase(config.DATABASE_URL);
const mediaServer = createMediaServer({
  port: config.RTMP_PORT,
  secret: config.RTMP_SECRET,
  storeDir: join(config.MEDIA_DIR, ".nms"),
});

const trainings = createTrainingsModule(createPrismaTrainingsRepository(db));
const signaling = createSignalingModule();
const recordings = createRecordingsModule(createPrismaRecordingsRepository(db), trainings.service, {
  ffmpegPath: config.FFMPEG_PATH,
  ffprobePath: config.FFPROBE_PATH,
  recordingsDir: config.RECORDINGS_DIR,
});
const liveStreams = createLiveStreamsModule({
  repository: createPrismaLiveStreamsRepository(db),
  trainings: trainings.service,
  mediaServer,
  options: {
    ffmpegPath: config.FFMPEG_PATH,
    mediaDir: config.MEDIA_DIR,
    rtmpPort: config.RTMP_PORT,
    rtmpSecret: config.RTMP_SECRET,
  },
  recordings: recordings.service,
});

const app = createApp({
  trainings: trainings.router,
  liveStreams: liveStreams.router,
  media: liveStreams.mediaRouter,
  recordings: recordings.router,
  recordingFiles: recordings.filesRouter,
});
const server = createServer(app);
attachUpgradeRouter(server, config.ALLOWED_ORIGINS, [signaling.gateway.route, liveStreams.gateway.route]);

await mkdir(config.RECORDINGS_DIR, { recursive: true });
await liveStreams.service.endOrphans();
await recordings.service.failOrphans();
await mediaServer.start();
server.listen(config.PORT, () => console.info(`API en http://localhost:${config.PORT}`));

/** Cierra en orden inverso al arranque: entradas nuevas, emisiones, RTMP y base de datos. */
const shutdown = async (): Promise<void> => {
  server.close();
  signaling.gateway.close();
  liveStreams.gateway.close();
  await liveStreams.service.stopAll();
  await mediaServer.stop();
  await db.$disconnect();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
