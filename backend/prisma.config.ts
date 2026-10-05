/**
 * Configuración del CLI de Prisma: ubicación del schema, de las migraciones y URL de la base.
 * La leen `prisma generate` y `prisma migrate *`; la aplicación no la importa.
 */
import { existsSync } from "node:fs";
import { defineConfig, env } from "prisma/config";

/** Carga `.env` en `process.env` cuando existe; en contenedor las variables llegan del compose. */
const loadLocalEnvFile = (): void => {
  if (existsSync(".env")) process.loadEnvFile(".env");
};

loadLocalEnvFile();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
