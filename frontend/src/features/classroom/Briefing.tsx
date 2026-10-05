/**
 * Briefing: el pase de formación. Presenta escenario, objetivo, cómo se interactúa y el marco
 * normativo, y recoge el nombre del alumno antes de ponerse las gafas.
 */
import { useActionState } from "react";
import type { Scenario, TrainingSession } from "../../shared/api/schemas.ts";
import { Icon, type IconName } from "../../shared/ui/Icon.tsx";
import { SectionTitle } from "../../shared/ui/SectionTitle.tsx";
import { formatClock } from "../headset/scene/broadcast-overlay.ts";
import { startTraining } from "../training/api.ts";

/** Paso del procedimiento que se explica al alumno. */
interface Step {
  icon: IconName;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  { icon: "goggles", title: "Ponte las gafas", body: "Verás cómo el alumno se coloca el visor; al terminar, la vista pasa a primera persona." },
  { icon: "drag", title: "Mira alrededor", body: "Arrastra sobre la escena o usa las flechas del teclado para girar la cabeza." },
  { icon: "reticle", title: "Fija la mirada", body: "Mantén la retícula 1,2 s sobre algo peligroso. Si es un riesgo, queda identificado." },
  { icon: "card", title: "Decide qué haces", body: "Elige una de las tres actuaciones con 1, 2 o 3. No sabrás si acertaste hasta el informe." },
];

/** Resultado del formulario. */
type StartResult = { error: string } | null;

/** Campo rotulado del pase, como las casillas de un billete. */
const PassField = ({ label, children, figure = false }: { label: string; children: string; figure?: boolean }) => (
  <div className="border-l border-rule px-4 py-3 first:border-l-0">
    <p className="caps text-xs text-navy-soft">{label}</p>
    <p className={`mt-1 text-lg ${figure ? "carbon" : "caps"}`}>{children}</p>
  </div>
);

/** Cómo se puntúa la prueba, dicho antes de empezar. */
const Criteria = ({ scenario }: { scenario: Scenario }) => (
  <div className="border border-navy bg-coupon px-5 py-4">
    <p className="caps text-sm">Cómo se evalúa</p>
    <ul className="mt-2 list-disc space-y-1 pl-5 text-body leading-relaxed">
      <li>Cada riesgo vale dos puntos: uno por identificarlo y otro por elegir la actuación correcta.</li>
      <li>Apruebas con un {scenario.passCriteria.minScorePercent} % de los puntos o más.</li>
      {scenario.passCriteria.requireHighSeverity && <li>Y además con todos los riesgos de severidad alta identificados y bien resueltos.</li>}
      <li>La sesión se graba; en el informe podrás revisarla riesgo a riesgo.</li>
    </ul>
  </div>
);

/** Pase de formación con el formulario de inicio. */
export const Briefing = ({ scenario, onStart }: { scenario: Scenario; onStart(session: TrainingSession): void }) => {
  const [result, action, pending] = useActionState(async (_previous: StartResult, form: FormData): Promise<StartResult> => {
    try {
      onStart(await startTraining(String(form.get("traineeName") ?? "")));
      return null;
    } catch (error) {
      return { error: error instanceof Error ? `No se pudo abrir la sesión: ${error.message}` : "No se pudo abrir la sesión" };
    }
  }, null);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section aria-labelledby="pase" className="space-y-6">
        <h1 id="pase" className="display text-6xl md:text-8xl">
          Antes de entrar
          <br />
          <span className="text-jet">al taller</span>
        </h1>
        <p className="max-w-measure text-lg leading-relaxed">
          {scenario.situation} {scenario.objective}
        </p>
        <div className="drop-shadow-coupon">
        <form action={action} className="notched border border-navy bg-coupon [--notch-x:calc(100%-11rem)]">
          <div className="grid grid-cols-2 border-b border-rule md:grid-cols-4">
            <PassField label="Escenario">{scenario.title}</PassField>
            <PassField label="Riesgos" figure>{String(scenario.hazards.length)}</PassField>
            <PassField label="Tiempo" figure>{formatClock(scenario.timeLimitSeconds)}</PassField>
            <PassField label="Para aprobar" figure>{`≥ ${scenario.passCriteria.minScorePercent} %`}</PassField>
          </div>
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end">
            <label className="flex-1">
              <span className="caps text-xs text-navy-soft">Nombre del alumno</span>
              <input
                name="traineeName"
                required
                maxLength={80}
                autoComplete="name"
                placeholder="Nombre y apellido"
                className="mt-1 block w-full border-2 border-navy bg-white px-3 py-2.5 text-lg placeholder:text-navy-soft focus:border-jet focus:outline-none"
              />
            </label>
            <button
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 bg-jet px-6 py-3.5 caps text-base text-white transition-colors hover:bg-jet-deep disabled:opacity-60"
            >
              <Icon name="goggles" className="text-xl" />
              {pending ? "Preparando el visor…" : "Ponerse las gafas"}
            </button>
          </div>
          {result && (
            <p role="alert" className="px-5 pb-4 text-sm text-jet">
              {result.error}. Comprueba que la API está arrancada y vuelve a intentarlo.
            </p>
          )}
        </form>
        </div>
      </section>

      <section aria-labelledby="procedimiento" className="space-y-5">
        <SectionTitle id="procedimiento">Procedimiento</SectionTitle>
        <ol className="space-y-4">
          {STEPS.map((step) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center bg-navy text-2xl text-white">
                <Icon name={step.icon} />
              </span>
              <div>
                <p className="caps text-base">{step.title}</p>
                <p className="text-navy-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Criteria scenario={scenario} />
        <figure className="bg-carbon-copy px-5 py-4 text-carbon">
          <blockquote className="leading-relaxed">«{scenario.framework.quote}»</blockquote>
          <figcaption className="mt-2 caps text-xs">
            <a href={scenario.framework.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {scenario.framework.reference}
            </a>
          </figcaption>
        </figure>
      </section>
    </div>
  );
};
