/**
 * Sello de goma sobre un cupón: nada desaparece del talonario, se sella o se anula.
 */

/** Tinta del sello: carbón para validar, verde para aprobar, rojo para anular o suspender. */
type StampTone = "valid" | "pass" | "void";

const TONES: Record<StampTone, string> = {
  valid: "border-carbon text-carbon",
  pass: "border-ok text-ok",
  void: "border-jet text-jet-deep",
};

const SIZES = {
  sm: "border-2 px-1.5 py-0.5 text-micro -outline-offset-4",
  md: "border-3 px-2.5 py-1 text-sm -outline-offset-6",
  lg: "border-4 px-5 py-2 text-3xl -outline-offset-8",
} as const;

/** Sello inclinado con doble filete. `rotate` en grados. */
export const Stamp = ({ children, tone, rotate = -8, size = "md" }: { children: string; tone: StampTone; rotate?: number; size?: keyof typeof SIZES }) => (
  <span
    className={`stamp-in inline-block whitespace-nowrap caps leading-none outline outline-1 ${SIZES[size]} ${TONES[tone]}`}
    style={{ transform: `rotate(${rotate}deg)`, ["--stamp-rotate" as string]: `${rotate}deg` }}
  >
    {children}
  </span>
);
