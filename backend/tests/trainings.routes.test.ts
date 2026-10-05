import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createApp } from "../src/app.ts";
import { createTrainingsModule } from "../src/modules/trainings/trainings.module.ts";
import { createInMemoryTrainingsRepository } from "./support/in-memory-trainings.repository.ts";

describe("API de formaciones", () => {
  let server: Server;
  let base: string;

  before(async () => {
    const trainings = createTrainingsModule(createInMemoryTrainingsRepository());
    server = createServer(createApp({ trainings: trainings.router }));
    server.listen(0);
    await once(server, "listening");
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/trainings`;
  });

  after(() => server.close());

  const post = async (path: string, body: unknown = {}) => {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };

  it("valida el cuerpo con 400", async () => {
    assert.equal((await post("", { traineeName: "" })).status, 400);
  });

  it("registra riesgos, rechaza duplicados y calcula métricas", async () => {
    const { status, body: session } = await post("", { traineeName: "Ane" });
    assert.equal(status, 201);

    const first = await post(`/${session.id}/hazards`, { hazardId: "cable-pelado", reactionMs: 1200 });
    assert.equal(first.status, 201);
    assert.equal(first.body.detected, 1);

    assert.equal((await post(`/${session.id}/hazards`, { hazardId: "cable-pelado", reactionMs: 10 })).status, 409);
    assert.equal((await post(`/${session.id}/hazards`, { hazardId: "no-existe", reactionMs: 10 })).status, 404);

    await post(`/${session.id}/hazards`, { hazardId: "derrame-aceite", reactionMs: 800 });
    const finished = await post(`/${session.id}/finish`);
    assert.equal(finished.body.finished, true);
    assert.equal(finished.body.averageReactionMs, 1000);
    assert.equal(finished.body.total, 4);

    assert.equal((await post(`/${session.id}/hazards`, { hazardId: "extintor-bloqueado", reactionMs: 1 })).status, 409);
  });

  it("emite las métricas por SSE al registrar un riesgo", async () => {
    const { body: session } = await post("", { traineeName: "Iker" });
    const controller = new AbortController();
    const response = await fetch(`${base}/${session.id}/events`, { signal: controller.signal });
    assert.equal(response.headers.get("content-type"), "text/event-stream");
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    assert.match((await reader.read()).value ?? "", /"detected":0/);
    await post(`/${session.id}/hazards`, { hazardId: "carga-suspendida", reactionMs: 500 });
    assert.match((await reader.read()).value ?? "", /"detected":1/);
    controller.abort();
  });

  it("no envía la respuesta correcta en el escenario de la prueba", async () => {
    const scenario = (await (await fetch(`${base}/scenario`)).json()) as { hazards: Array<Record<string, unknown>> };
    assert.ok(scenario.hazards.length > 0);
    assert.ok(scenario.hazards.every((hazard) => !("correctOption" in hazard) && Array.isArray(hazard.options)));
  });

  it("corrige la decisión en el servidor y la revela solo al cerrar", async () => {
    const { body: session } = await post("", { traineeName: "Leire" });
    assert.equal((await post(`/${session.id}/hazards/cable-pelado/decision`, { option: 2 })).status, 409);
    await post(`/${session.id}/hazards`, { hazardId: "cable-pelado", reactionMs: 900 });
    const decided = await post(`/${session.id}/hazards/cable-pelado/decision`, { option: 2 });
    assert.equal(decided.status, 201);
    const cable = (decided.body.hazards as Array<Record<string, unknown>>).find((hazard) => hazard.id === "cable-pelado");
    assert.equal(cable?.decided, true);
    assert.equal(cable?.measureCorrect, null);
    assert.equal(cable?.correctOption, null);
    assert.equal((await post(`/${session.id}/hazards/cable-pelado/decision`, { option: 0 })).status, 409);
    const finished = await post(`/${session.id}/finish`);
    const revealed = (finished.body.hazards as Array<Record<string, unknown>>).find((hazard) => hazard.id === "cable-pelado");
    assert.equal(revealed?.correctOption, 2);
    assert.equal(revealed?.measureCorrect, true);
  });

  it("da apto solo con nota suficiente y todos los riesgos altos bien resueltos", async () => {
    const answers: Record<string, number> = { "carga-suspendida": 1, "cable-pelado": 2, "derrame-aceite": 1, "extintor-bloqueado": 1 };
    const { body: session } = await post("", { traineeName: "Unai" });
    for (const [hazardId, option] of Object.entries(answers)) {
      await post(`/${session.id}/hazards`, { hazardId, reactionMs: 1000 });
      await post(`/${session.id}/hazards/${hazardId}/decision`, { option });
    }
    const result = await post(`/${session.id}/finish`);
    assert.equal(result.body.scorePercent, 88);
    assert.equal(result.body.verdict, "apto");

    const { body: other } = await post("", { traineeName: "Nerea" });
    for (const hazardId of ["derrame-aceite", "extintor-bloqueado", "cable-pelado"]) {
      await post(`/${other.id}/hazards`, { hazardId, reactionMs: 1000 });
      await post(`/${other.id}/hazards/${hazardId}/decision`, { option: answers[hazardId] === 1 ? 1 : 0 });
    }
    const failed = await post(`/${other.id}/finish`);
    assert.equal(failed.body.verdict, "no-apto");
  });

  it("devuelve 404 para una sesión inexistente", async () => {
    const response = await fetch(`${base}/00000000-0000-4000-8000-000000000000/metrics`);
    assert.equal(response.status, 404);
  });
});
