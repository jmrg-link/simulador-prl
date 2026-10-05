/**
 * Configuración de la API leída y validada desde variables de entorno al arrancar.
 * Un valor ausente o inválido detiene el proceso antes de abrir ningún puerto.
 */
import { resolve } from "node:path";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
  RTMP_PORT: z.coerce.number().int().positive().default(1935),
  RTMP_SECRET: z.string().min(16),
  MEDIA_DIR: z.string().default("./media").transform((dir) => resolve(dir)),
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
  RECORDINGS_DIR: z.string().default("./recordings").transform((dir) => resolve(dir)),
});

/** Configuración tipada de la API. */
export type Config = z.infer<typeof schema>;

/**
 * Valida un conjunto de variables de entorno.
 *
 * @param env - Variables a validar; por defecto `process.env`.
 * @throws ZodError si falta una variable obligatoria o alguna tiene un formato inválido.
 */
export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => schema.parse(env);
