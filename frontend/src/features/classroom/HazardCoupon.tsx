/**
 * Cupón de riesgo del talonario. En el puesto del instructor es una fila compacta que se sella al
 * identificar el riesgo; en el informe final se despliega con la ficha completa y su norma.
 * La matriz va separada del cuerpo por una línea perforada y las muescas cortan el filete del cupón.
 */
import type { ReactNode } from "react";
import type { Hazard } from "../../shared/api/schemas.ts";
import { couponCode } from "../../shared/coupon-code.ts";
import { Icon } from "../../shared/ui/Icon.tsx";
import { Stamp } from "../../shared/ui/Stamp.tsx";

/** Estado del cupón. */
export type CouponState = "pendiente" | "identificado" | "no-detectado";

/** Props comunes del cupón. */
interface HazardCouponProps {
  hazard: Hazard;
  index: number;
  state: CouponState;
  reactionMs: number | null;
  /** Línea secundaria bajo el riesgo, p. ej. el estado de la decisión. */
  note?: string;
}


/** Tiempo de reacción en segundos con un decimal, o raya si no hay. */
const seconds = (ms: number | null): string => (ms === null ? "—" : `${(ms / 1000).toFixed(1)} s`);

/** Sello que corresponde al estado, si alguno. */
const StateStamp = ({ state, size }: { state: CouponState; size: "sm" | "md" }) =>
  state === "identificado" ? (
    <Stamp tone="valid" size={size}>
      Identificado
    </Stamp>
  ) : state === "no-detectado" ? (
    <Stamp tone="void" size={size} rotate={-6}>
      No detectado
    </Stamp>
  ) : null;

/** Matriz izquierda con el código y la severidad, separada por la línea perforada. */
const CouponStub = ({ index, hazard }: { index: number; hazard: Hazard }) => (
  <>
    <div className="flex w-20 shrink-0 flex-col justify-center gap-0.5 bg-navy px-3 py-1.5 text-coupon">
      <span className="font-mono text-sm">{couponCode(index)}</span>
      <span className={`caps whitespace-nowrap text-micro ${hazard.severity === "alta" ? "text-jet-light" : "text-coupon/80"}`}>{hazard.severity}</span>
    </div>
    <div className="perforation w-2 shrink-0" aria-hidden />
  </>
);

/** Papel del cupón: filete azul, muescas en la perforación y sombra que respeta la máscara. */
const CouponPaper = ({ children }: { children: ReactNode }) => (
  <li className="drop-shadow-coupon">
    <div className="notched flex border border-navy bg-coupon">{children}</div>
  </li>
);

/** Fila de cabecera de columnas del talonario compacto. */
export const CouponColumns = () => (
  <div className="flex items-center px-px caps text-micro text-navy-soft" aria-hidden>
    <span className="w-22 pl-3">Cupón · Sev.</span>
    <span className="flex-1 pl-3">Riesgo</span>
    <span className="w-24 pr-4 text-right">Reacción</span>
  </div>
);

/** Cupón compacto de una sola fila para el puesto del instructor. */
export const HazardCoupon = ({ hazard, index, state, reactionMs, note }: HazardCouponProps) => (
  <CouponPaper>
    <CouponStub index={index} hazard={hazard} />
    <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-1.5 pl-3">
      <div className="min-w-0 flex-1">
        <p className={`caps text-sm leading-tight ${state === "pendiente" ? "text-navy-soft" : ""}`}>
          {state === "pendiente" ? "Sin identificar" : hazard.label}
        </p>
        {note && <p className="text-xs text-navy-soft">{note}</p>}
      </div>
      <StateStamp state={state} size="sm" />
    </div>
    <p className="flex w-24 shrink-0 items-center justify-end pr-4 whitespace-nowrap carbon text-sm">{seconds(reactionMs)}</p>
  </CouponPaper>
);

/** Bloque rotulado de la ficha completa. */
const FichaField = ({ title, children }: { title: string; children: string }) => (
  <div>
    <p className="caps text-xs text-jet">{title}</p>
    <p className="mt-1 max-w-measure text-body leading-relaxed">{children}</p>
  </div>
);

/** Decisión del alumno frente a la correcta, revelada en el informe. */
export interface FichaDecision {
  chosen: number | null;
  correct: number | null;
}

/** Etiqueta de una opción en el informe: la correcta, la elegida o ambas. */
const optionTag = (index: number, decision: FichaDecision): string | null => {
  if (index === decision.correct && index === decision.chosen) return "Tu elección · correcta";
  if (index === decision.correct) return "Correcta";
  if (index === decision.chosen) return "Tu elección · incorrecta";
  return null;
};

/** Color de una opción: verde la correcta, rojo la elegida si era incorrecta, neutro el resto. */
const optionTone = (index: number, decision: FichaDecision): string => {
  if (index === decision.correct) return "border-ok bg-ok-tint text-ok";
  if (index === decision.chosen) return "border-jet bg-jet-tint text-jet-deep";
  return "border-rule text-navy-soft";
};

/** Las tres actuaciones con la elegida y la correcta marcadas. */
const DecisionReview = ({ options, decision }: { options: readonly string[]; decision: FichaDecision }) => (
  <div>
    <p className="caps text-xs text-jet">{decision.chosen === null ? "No llegó a decidir" : "Qué decidió"}</p>
    <ol className="mt-2 space-y-1.5">
      {options.map((option, index) => {
        const tag = optionTag(index, decision);
        const tone = optionTone(index, decision);
        return (
          <li key={option} className={`flex flex-wrap items-baseline gap-x-3 border px-3 py-1.5 text-body ${tone}`}>
            <span className="font-mono">{index + 1}</span>
            <span className="min-w-0 flex-1">{option}</span>
            {tag && <span className="caps text-xs">{tag}</span>}
          </li>
        );
      })}
    </ol>
  </div>
);

/** Props de la ficha del informe. */
interface HazardFichaProps extends HazardCouponProps {
  decision: FichaDecision;
}

/** Cupón desplegado con la ficha didáctica, la decisión y la cita normativa, para el informe final. */
export const HazardFicha = ({ hazard, index, state, reactionMs, decision }: HazardFichaProps) => (
  <CouponPaper>
    <CouponStub index={index} hazard={hazard} />
    <div className="grid flex-1 gap-4 py-5 pr-6 pl-4 md:grid-cols-[1fr_auto]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h3 className="display text-3xl">{hazard.label}</h3>
          <span className="carbon text-sm">{seconds(reactionMs)}</span>
        </div>
        <p className="max-w-measure text-body leading-relaxed text-navy-soft">{hazard.description}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <FichaField title="Qué puede pasar">{hazard.consequence}</FichaField>
          <FichaField title="Qué hacer">{hazard.measure}</FichaField>
        </div>
        {state === "identificado" && <DecisionReview options={hazard.options} decision={decision} />}
        <blockquote className="bg-carbon-copy px-4 py-3 text-carbon">
          <p className="text-body leading-relaxed">«{hazard.regulation.quote}»</p>
          <footer className="mt-2 flex flex-wrap items-center gap-x-3 caps text-xs">
            {hazard.regulation.reference}
            <a href={hazard.regulation.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
              Ver en boe.es <Icon name="external" />
            </a>
          </footer>
        </blockquote>
      </div>
      <div className="flex items-start justify-end">
        <StateStamp state={state} size="md" />
      </div>
    </div>
  </CouponPaper>
);
