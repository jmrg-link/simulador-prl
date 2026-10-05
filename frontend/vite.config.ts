/**
 * Configuración de Vite. En desarrollo, el proxy hace que API, HLS y WebSockets compartan
 * origen con el frontal, igual que tras nginx en el compose: no hace falta CORS. El servidor
 * escucha también en la red local para que otros equipos abran el enlace de difusión, y
 * `__LAN_ORIGIN__` lleva la dirección con la que construirlo.
 */
import { networkInterfaces } from "node:os";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const API = process.env.API_URL ?? "http://localhost:3000";
const PORT = 5173;

/** Primera IPv4 no interna del equipo, o `null` si no hay red. */
const lanAddress = (): string | null =>
  Object.values(networkInterfaces())
    .flat()
    .find((address) => address?.family === "IPv4" && !address.internal)?.address ?? null;

const lan = lanAddress();

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __LAN_ORIGIN__: JSON.stringify(lan ? `http://${lan}:${PORT}` : null),
  },
  server: {
    host: true,
    port: PORT,
    proxy: {
      "/api": API,
      "/media": API,
      "/recordings": API,
      "/ws": { target: API, ws: true },
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
