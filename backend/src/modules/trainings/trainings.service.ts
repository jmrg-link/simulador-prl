/**
 * Casos de uso de las sesiones de formación. Cada cambio publica las métricas recalculadas
 * en el `Topic` para que el panel del instructor las reciba en vivo.
 */
import type { Topic } from "../../shared/events/topic.ts";
import { conflict, notFound } from "../../shared/http/http-error.ts";
import { computeMetrics, type TrainingMetrics } from "./metrics.ts";
import { hasHazard, publicScenario, type PublicScenario, type Scenario } from "./scenario.ts";
import type { TrainingSession, TrainingsRepository } from "./trainings.repository.ts";

const TIME_GRACE_SECONDS = 5;

/** Servicio de sesiones de formación. */
export class TrainingsService {
  readonly #repository: TrainingsRepository;
  readonly #scenario: Scenario;
  readonly #metricsTopic: Topic<TrainingMetrics>;

  /**
   * Crea el servicio con sus dependencias.
   *
   * @param repository - Persistencia de sesiones y eventos.
   * @param scenario - Catálogo de riesgos contra el que se validan los eventos.
   * @param metricsTopic - Bus donde se publican las métricas tras cada cambio.
   */
  constructor(repository: TrainingsRepository, scenario: Scenario, metricsTopic: Topic<TrainingMetrics>) {
    this.#repository = repository;
    this.#scenario = scenario;
    this.#metricsTopic = metricsTopic;
  }

  /** Escenario activo tal como se sirve durante la prueba, sin respuestas correctas. */
  scenario(): PublicScenario {
    return publicScenario(this.#scenario);
  }

  /** Abre una sesión de formación para un alumno. */
  start(traineeName: string): Promise<TrainingSession> {
    return this.#repository.create({ traineeName, scenarioId: this.#scenario.id });
  }

  /** Sesiones sin cerrar, la más reciente primero. */
  listActive(): Promise<TrainingSession[]> {
    return this.#repository.listActive();
  }

  /**
   * Métricas actuales de una sesión.
   *
   * @throws HttpError 404 si la sesión no existe.
   */
  async metrics(id: string): Promise<TrainingMetrics> {
    return this.#metricsOf(await this.get(id));
  }

  /**
   * Registra un riesgo identificado y publica las métricas resultantes.
   *
   * @throws HttpError 404 si la sesión o el riesgo no existen; 409 si la sesión terminó
   * o el riesgo ya estaba registrado.
   */
  async recordHazard(id: string, hazardId: string, reactionMs: number): Promise<TrainingMetrics> {
    const session = await this.#getOpen(id);
    if (!hasHazard(this.#scenario, hazardId)) throw notFound(`El riesgo ${hazardId}`);
    const added = await this.#repository.addHazardEvent(id, { hazardId, reactionMs });
    if (!added) throw conflict(`El riesgo ${hazardId} ya estaba registrado`);
    return this.#publishMetrics(session);
  }

  /**
   * Registra la actuación que eligió el alumno para un riesgo ya identificado y la corrige.
   *
   * @throws HttpError 404 si la sesión o el riesgo no existen; 409 si la sesión terminó, se agotó
   * el tiempo, el riesgo no estaba identificado o ya tenía una decisión.
   */
  async decide(id: string, hazardId: string, option: number): Promise<TrainingMetrics> {
    const session = await this.#getOpen(id);
    const hazard = this.#scenario.hazards.find((candidate) => candidate.id === hazardId);
    if (!hazard) throw notFound(`El riesgo ${hazardId}`);
    const saved = await this.#repository.addDecision(id, hazardId, option, option === hazard.correctOption);
    if (!saved) throw conflict(`El riesgo ${hazardId} no está identificado o ya tiene una decisión`);
    return this.#publishMetrics(session);
  }

  /** Línea de tiempo de los riesgos identificados, con su etiqueta, para los capítulos del vídeo. */
  async timeline(id: string): Promise<Array<{ label: string; detectedAt: Date }>> {
    const events = await this.#repository.listHazardEvents(id);
    const labels = new Map(this.#scenario.hazards.map(({ id: hazardId, label }) => [hazardId, label]));
    return events.map(({ hazardId, detectedAt }) => ({ label: labels.get(hazardId) ?? hazardId, detectedAt }));
  }

  /**
   * Cierra la sesión. Es idempotente: cerrar una sesión cerrada devuelve sus métricas.
   *
   * @throws HttpError 404 si la sesión no existe.
   */
  async finish(id: string): Promise<TrainingMetrics> {
    const session = await this.get(id);
    if (session.endedAt) return this.#metricsOf(session);
    return this.#publishMetrics(await this.#repository.finish(id, new Date()));
  }

  /**
   * Devuelve la sesión o lanza 404.
   *
   * @throws HttpError 404 si no existe.
   */
  async get(id: string): Promise<TrainingSession> {
    const session = await this.#repository.findById(id);
    if (!session) throw notFound("La sesión de formación");
    return session;
  }

  /**
   * Devuelve la sesión si sigue abierta y dentro del tiempo de la prueba, con unos segundos de
   * margen para la latencia de red.
   *
   * @throws HttpError 404 si no existe; 409 si terminó o se agotó el tiempo.
   */
  async #getOpen(id: string): Promise<TrainingSession> {
    const session = await this.get(id);
    if (session.endedAt) throw conflict("La sesión ya terminó");
    const limitMs = (this.#scenario.timeLimitSeconds + TIME_GRACE_SECONDS) * 1000;
    if (Date.now() - session.startedAt.getTime() > limitMs) throw conflict("Se agotó el tiempo de la prueba");
    return session;
  }

  /** Calcula las métricas de la sesión con sus eventos actuales. */
  async #metricsOf(session: TrainingSession): Promise<TrainingMetrics> {
    return computeMetrics(session, await this.#repository.listHazardEvents(session.id), this.#scenario);
  }

  /** Recalcula, publica y devuelve las métricas de la sesión. */
  async #publishMetrics(session: TrainingSession): Promise<TrainingMetrics> {
    const metrics = await this.#metricsOf(session);
    this.#metricsTopic.publish(session.id, metrics);
    return metrics;
  }
}
