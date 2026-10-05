import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Rutas públicas que sirve el backend y que el frontal debe reenviarle. */
const BACKEND_PREFIXES = ["/api", "/media", "/recordings", "/ws"];

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), "utf8");

describe("reenvío de rutas al backend", () => {
  it("el proxy de Vite reenvía todas las rutas públicas del backend", () => {
    const config = read("../vite.config.ts");
    for (const prefix of BACKEND_PREFIXES) expect(config).toContain(`"${prefix}"`);
  });

  it("nginx reenvía todas las rutas públicas del backend", () => {
    const template = read("../nginx/default.conf.template");
    for (const prefix of BACKEND_PREFIXES) expect(template).toContain(`location ${prefix}/`);
  });
});
