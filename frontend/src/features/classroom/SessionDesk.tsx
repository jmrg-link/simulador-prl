/**
 * Mesa de la sesión en modo aula: el puesto del alumno con el simulador de gafas y, al lado, el
 * puesto del instructor que lo recibe por WebRTC. Las dos mitades hablan por la red como lo harían
 * en equipos distintos; compartir pantalla es solo la disposición del aula.
 *
 * Conduce la prueba: la grabación arranca en cuanto hay imagen, cada riesgo identificado abre una
 * decisión que se responde con 1, 2 o 3, y la sesión se cierra sola al agotarse el tiempo.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Hazard, Scenario, TrainingMetrics, TrainingSession } from "../../shared/api/schemas.ts";
import { Icon } from "../../shared/ui/Icon.tsx";
import { SectionTitle } from "../../shared/ui/SectionTitle.tsx";
import { useBroadcaster } from "../broadcast/useBroadcaster.ts";
import { HeadsetSimulator } from "../headset/HeadsetSimulator.tsx";
import type { PendingDecision } from "../headset/scene/HeadsetRig.tsx";
import { useIngest } from "../live/useIngest.ts";
import { decideHazard, finishTraining, recordHazard } from "../training/api.ts";
import { InstructorStation } from "./InstructorStation.tsx";

const CONFIRMATION_MS = 2_000;
const TICK_MS = 500;
const OPTION_KEYS = ["1", "2", "3"] as const;

/** Props de la mesa de sesión. */
interface SessionDeskProps {
  session: TrainingSession;
  scenario: Scenario;
  onFinished(metrics: TrainingMetrics): void;
}

/** Segundos que quedan de prueba desde que se abrió la sesión. */
const remainingSeconds = (session: TrainingSession, limitSeconds: number): number =>
  Math.max(0, limitSeconds - (Date.now() - Date.parse(session.startedAt)) / 1000);

/** Cuenta atrás de la prueba que se actualiza dos veces por segundo. */
const useCountdown = (session: TrainingSession, limitSeconds: number): number => {
  const [remaining, setRemaining] = useState(() => remainingSeconds(session, limitSeconds));
  useEffect(() => {
    const timer = setInterval(() => setRemaining(remainingSeconds(session, limitSeconds)), TICK_MS);
    return () => clearInterval(timer);
  }, [session, limitSeconds]);
  return remaining;
};

/** Ayuda permanente de controles bajo la escena. */
const ControlsHint = () => (
  <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy-soft">
    <li className="flex items-center gap-2">
      <Icon name="drag" className="text-lg text-navy" /> Arrastra o usa las flechas para mirar
    </li>
    <li className="flex items-center gap-2">
      <Icon name="reticle" className="text-lg text-navy" /> 1,2 s de mirada identifica un riesgo
    </li>
  </ul>
);

/** Barra accesible con las tres actuaciones del riesgo en decisión, espejo de la tarjeta del canvas. */
const DecisionBar = ({ hazard, decision, onChoose }: { hazard: Hazard; decision: PendingDecision; onChoose(option: number): void }) => (
  <fieldset className="border border-navy bg-coupon p-4" aria-live="polite">
    <legend className="bg-jet px-2 caps text-sm text-coupon">¿Qué haces con «{hazard.label}»?</legend>
    <div className="grid gap-2 md:grid-cols-3">
      {hazard.options.map((option, index) => (
        <button
          key={option}
          type="button"
          disabled={decision.chosen !== null}
          aria-pressed={decision.chosen === index}
          onClick={() => onChoose(index)}
          className={`flex items-start gap-3 border px-3 py-2 text-left text-body transition-colors disabled:cursor-default ${
            decision.chosen === index ? "border-carbon bg-carbon-copy text-carbon" : "border-rule hover:border-navy disabled:opacity-60"
          }`}
        >
          <kbd className="carbon font-mono">{index + 1}</kbd>
          {option}
        </button>
      ))}
    </div>
  </fieldset>
);

/** Sesión en curso en modo aula. */
export const SessionDesk = ({ session, scenario, onFinished }: SessionDeskProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [detected, setDetected] = useState<ReadonlySet<string>>(new Set());
  const [decision, setDecision] = useState<PendingDecision | null>(null);
  const [finishing, setFinishing] = useState(false);
  const broadcast = useBroadcaster(stream, session.id);
  const ingest = useIngest(stream, session.id);
  const remaining = useCountdown(session, scenario.timeLimitSeconds);
  const finished = useRef(false);
  const { start: startIngest, stop: stopIngest, state: ingestState } = ingest;

  useEffect(() => {
    if (stream && ingestState.kind === "parada" && !ingestState.message) void startIngest();
  }, [stream, ingestState, startIngest]);

  const onDetect = useCallback(
    (hazardId: string, reactionMs: number) => {
      setDecision({ hazardId, chosen: null });
      void recordHazard(session.id, hazardId, reactionMs).then((metrics) =>
        setDetected(new Set(metrics.hazards.filter((hazard) => hazard.detected).map((hazard) => hazard.id))),
      );
    },
    [session.id],
  );

  const choose = useCallback(
    (option: number) => {
      if (!decision || decision.chosen !== null) return;
      setDecision({ ...decision, chosen: option });
      void decideHazard(session.id, decision.hazardId, option).finally(() => setTimeout(() => setDecision(null), CONFIRMATION_MS));
    },
    [decision, session.id],
  );

  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    setFinishing(true);
    stopIngest();
    onFinished(await finishTraining(session.id));
  }, [stopIngest, onFinished, session.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const option = OPTION_KEYS.indexOf(event.key as (typeof OPTION_KEYS)[number]);
      if (option >= 0) choose(option);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose]);

  useEffect(() => {
    if (remaining <= 0) void finish();
  }, [remaining, finish]);

  const pendingHazard = decision ? scenario.hazards.find(({ id }) => id === decision.hazardId) : undefined;

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section aria-labelledby="alumno" className="min-w-0 space-y-4">
        <SectionTitle
          id="alumno"
          aside={
            <span className="caps text-xs text-navy-soft">
              Emitiendo a {broadcast.viewers} {broadcast.viewers === 1 ? "receptor" : "receptores"}
            </span>
          }
        >
          {`Puesto del alumno · ${session.traineeName}`}
        </SectionTitle>
        <HeadsetSimulator
          hazards={scenario.hazards}
          detected={detected}
          traineeName={session.traineeName}
          scenarioTitle={scenario.title}
          recording={ingestState.kind === "emitiendo"}
          remainingS={remaining}
          decision={decision}
          onDetect={onDetect}
          onStream={setStream}
        />
        {pendingHazard && decision && <DecisionBar hazard={pendingHazard} decision={decision} onChoose={choose} />}
        {broadcast.rejected && (
          <p role="alert" className="text-sm text-jet">
            La sala ya tiene un emisor: {broadcast.rejected}. Cierra la otra pestaña con esta sesión.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ControlsHint />
          <button
            type="button"
            onClick={() => void finish()}
            disabled={finishing}
            className="inline-flex items-center gap-2 bg-navy px-5 py-3 caps text-sm text-coupon transition-colors hover:bg-jet disabled:opacity-60"
          >
            <Icon name="exit" className="text-base" />
            {finishing ? "Cerrando la sesión…" : "Quitarse las gafas y evaluar"}
          </button>
        </div>
      </section>
      <InstructorStation sessionId={session.id} scenario={scenario} ingest={ingest} />
    </div>
  );
};
