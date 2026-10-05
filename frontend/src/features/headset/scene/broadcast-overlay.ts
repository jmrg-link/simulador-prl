/**
 * Grafismo de emisión dibujado con Canvas 2D sobre una textura que la escena coloca delante de la
 * cámara: indicador de directo y grabación, cuenta atrás de la prueba, rótulo del alumno y la
 * tarjeta de decisión del último riesgo identificado. Va dentro del canvas WebGL para que el
 * instructor, el directo HLS y la grabación vean lo mismo que el alumno, como el espejo de unas
 * gafas reales. La escala tipográfica está pensada para leerse a menos de la mitad de su tamaño.
 */
import { themeColor } from "../../../shared/ui/theme.ts";

/** Tarjeta de decisión que aparece al identificar un riesgo. */
export interface DecisionCard {
  code: string;
  severity: string;
  label: string;
  options: readonly string[];
  /** Opción elegida, o `null` mientras el alumno decide. */
  chosen: number | null;
}

/** Estado del grafismo en un instante. */
export interface OverlayState {
  traineeName: string;
  scenarioTitle: string;
  remainingS: number;
  detected: number;
  total: number;
  immersive: boolean;
  recording: boolean;
  card: DecisionCard | null;
}

/** Resolución lógica del grafismo; la textura se escala al tamaño de la vista. */
export const OVERLAY_SIZE = { width: 1280, height: 720 } as const;

const SANS = "'Archivo Variable', system-ui, sans-serif";
const MONO = "'Martian Mono Variable', ui-monospace, monospace";
const MARGIN = 36;
const BAR_HEIGHT = 44;
const URGENT_SECONDS = 30;

/** Paleta del tema, leída una vez por dibujo para no repetir los tokens aquí. */
const palette = () => ({
  navy: themeColor("navy"),
  muted: themeColor("navy-soft"),
  jet: themeColor("jet"),
  jetLight: themeColor("jet-light"),
  carbon: themeColor("carbon"),
  carbonCopy: themeColor("carbon-copy"),
  paper: themeColor("coupon"),
});

/** Paleta resuelta. */
type Palette = ReturnType<typeof palette>;

/** Fija tipografía condensada o normal en el contexto. */
const setFont = (ctx: CanvasRenderingContext2D, spec: string, condensed = true): void => {
  ctx.font = spec;
  ctx.fontStretch = condensed ? "condensed" : "normal";
};

/** Formatea segundos como `mm:ss`. */
export const formatClock = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
};

/** Parte `text` en líneas que caben en `maxWidth` con la fuente actual. */
const wrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] =>
  text.split(" ").reduce<string[]>((lines, word) => {
    const last = lines.at(-1);
    if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= maxWidth) {
      lines[lines.length - 1] = `${last} ${word}`;
      return lines;
    }
    return [...lines, word];
  }, []);

/** Pastilla de texto sobre fondo sólido; `indent` deja sitio a un icono. Devuelve su anchura. */
const pill = (ctx: CanvasRenderingContext2D, colors: Palette, text: string, x: number, background: string, indent = 0): number => {
  setFont(ctx, `700 26px ${SANS}`);
  const width = ctx.measureText(text).width + 32 + indent;
  ctx.fillStyle = background;
  ctx.fillRect(x, MARGIN, width, BAR_HEIGHT);
  ctx.fillStyle = colors.paper;
  ctx.fillText(text, x + 16 + indent, MARGIN + 31);
  return width;
};

/** Punto blanco de «en directo» o «grabando» dentro de una pastilla. */
const dot = (ctx: CanvasRenderingContext2D, x: number): void => {
  ctx.beginPath();
  ctx.arc(x + 24, MARGIN + BAR_HEIGHT / 2, 7, 0, Math.PI * 2);
  ctx.fill();
};

/** Indicador de directo, marca y, si se está grabando, el aviso de grabación. */
const drawLiveBar = (ctx: CanvasRenderingContext2D, colors: Palette, recording: boolean): void => {
  let x = MARGIN;
  x += pill(ctx, colors, "EN DIRECTO", x, colors.jet, 20);
  dot(ctx, MARGIN);
  x += pill(ctx, colors, "SIMULADOR PRL", x, colors.navy);
  if (!recording) return;
  const start = x + 8;
  pill(ctx, colors, "GRABANDO", start, colors.carbon, 20);
  dot(ctx, start);
};

/** Cuenta atrás de la prueba; en rojo cuando quedan menos de 30 segundos. */
const drawCountdown = (ctx: CanvasRenderingContext2D, colors: Palette, remainingS: number): void => {
  setFont(ctx, `700 18px ${SANS}`);
  const label = "TIEMPO";
  const labelWidth = ctx.measureText(label).width;
  setFont(ctx, `500 26px ${MONO}`, false);
  const text = formatClock(remainingS);
  const width = ctx.measureText(text).width + labelWidth + 44;
  const x = OVERLAY_SIZE.width - MARGIN - width;
  ctx.fillStyle = remainingS <= URGENT_SECONDS ? colors.jet : colors.navy;
  ctx.fillRect(x, MARGIN, width, BAR_HEIGHT);
  ctx.fillStyle = colors.paper;
  setFont(ctx, `700 18px ${SANS}`);
  ctx.fillText(label, x + 16, MARGIN + 29);
  setFont(ctx, `500 26px ${MONO}`, false);
  ctx.fillText(text, x + 28 + labelWidth, MARGIN + 31);
};

/**
 * Rótulo inferior como un cupón: matriz azul con «ALUMNO», cuerpo con nombre y escenario o fase,
 * y bloque rojo con el recuento de riesgos.
 */
const drawLowerThird = (ctx: CanvasRenderingContext2D, colors: Palette, state: OverlayState): void => {
  const height = 104;
  const y = OVERLAY_SIZE.height - MARGIN - height;
  const stub = 120;
  const body = 480;
  ctx.fillStyle = colors.navy;
  ctx.fillRect(MARGIN, y, stub, height);
  ctx.fillStyle = colors.paper;
  setFont(ctx, `700 22px ${SANS}`);
  ctx.fillText("ALUMNO", MARGIN + 18, y + 60);
  ctx.fillRect(MARGIN + stub, y, body, height);
  ctx.fillStyle = colors.navy;
  setFont(ctx, `800 46px ${SANS}`);
  ctx.fillText(state.traineeName.toUpperCase(), MARGIN + stub + 24, y + 52);
  setFont(ctx, `700 26px ${SANS}`);
  ctx.fillStyle = colors.muted;
  ctx.fillText(state.immersive ? state.scenarioTitle.toUpperCase() : "COLOCÁNDOSE LAS GAFAS…", MARGIN + stub + 24, y + 88);
  const counter = MARGIN + stub + body;
  ctx.fillStyle = colors.jet;
  ctx.fillRect(counter, y, 170, height);
  ctx.fillStyle = colors.paper;
  setFont(ctx, `700 22px ${SANS}`);
  ctx.fillText("RIESGOS", counter + 20, y + 36);
  setFont(ctx, `500 40px ${MONO}`, false);
  ctx.fillText(`${state.detected}/${state.total}`, counter + 20, y + 84);
};

const CARD_WIDTH = 540;
const CARD_STUB = 108;
const CARD_X = OVERLAY_SIZE.width - MARGIN - CARD_WIDTH;
const CARD_Y = MARGIN + BAR_HEIGHT + 24;
const CARD_PAD = 22;
const BODY_X = CARD_X + CARD_STUB + CARD_PAD;
const BODY_WIDTH = CARD_WIDTH - CARD_STUB - CARD_PAD * 2;
const OPTION_INDENT = 40;
const TITLE_LINE = 34;
const OPTION_LINE = 28;
const OPTION_GAP = 12;

/** Líneas ya ajustadas de la tarjeta. */
interface CardLines {
  title: string[];
  options: string[][];
}

/** Ajusta título y opciones con la tipografía con la que se dibujarán. */
const layoutCard = (ctx: CanvasRenderingContext2D, card: DecisionCard): CardLines => {
  setFont(ctx, `800 32px ${SANS}`);
  const title = wrap(ctx, card.label.toUpperCase(), BODY_WIDTH);
  setFont(ctx, `400 23px ${SANS}`, false);
  return { title, options: card.options.map((option) => wrap(ctx, option, BODY_WIDTH - OPTION_INDENT)) };
};

/** Alto total de la tarjeta para sus líneas. */
const cardHeight = (lines: CardLines): number =>
  CARD_PAD + lines.title.length * TITLE_LINE + 50 + lines.options.reduce((sum, option) => sum + option.length * OPTION_LINE + OPTION_GAP, 0) + 44;

/** Matriz azul de la tarjeta con el código y la severidad. */
const drawCardStub = (ctx: CanvasRenderingContext2D, colors: Palette, card: DecisionCard, height: number): void => {
  ctx.fillStyle = colors.navy;
  ctx.fillRect(CARD_X, CARD_Y, CARD_STUB, height);
  ctx.fillStyle = colors.paper;
  setFont(ctx, `500 22px ${MONO}`, false);
  ctx.fillText(card.code, CARD_X + 14, CARD_Y + 40);
  ctx.fillStyle = card.severity === "alta" ? colors.jetLight : colors.paper;
  setFont(ctx, `700 22px ${SANS}`);
  ctx.fillText(card.severity.toUpperCase(), CARD_X + 14, CARD_Y + 70);
};

/** Una opción numerada; la elegida va sobre papel carbón, las demás atenuadas tras decidir. */
const drawOption = (ctx: CanvasRenderingContext2D, colors: Palette, lines: string[], index: number, chosen: number | null, y: number): number => {
  const height = lines.length * OPTION_LINE + 6;
  if (chosen === index) {
    ctx.fillStyle = colors.carbonCopy;
    ctx.fillRect(BODY_X - 8, y - 24, BODY_WIDTH + 16, height + 6);
  }
  const faded = chosen !== null && chosen !== index;
  ctx.fillStyle = faded ? colors.muted : colors.jet;
  setFont(ctx, `500 24px ${MONO}`, false);
  ctx.fillText(String(index + 1), BODY_X, y);
  ctx.fillStyle = chosen === index ? colors.carbon : faded ? colors.muted : colors.navy;
  setFont(ctx, `400 23px ${SANS}`, false);
  lines.forEach((line, row) => ctx.fillText(line, BODY_X + OPTION_INDENT, y + row * OPTION_LINE));
  return y + lines.length * OPTION_LINE + OPTION_GAP;
};

/** Tarjeta de decisión del último riesgo identificado, como un cupón con matriz. */
const drawCard = (ctx: CanvasRenderingContext2D, colors: Palette, card: DecisionCard): void => {
  const lines = layoutCard(ctx, card);
  const height = cardHeight(lines);
  drawCardStub(ctx, colors, card, height);
  ctx.fillStyle = colors.paper;
  ctx.fillRect(CARD_X + CARD_STUB, CARD_Y, CARD_WIDTH - CARD_STUB, height);
  ctx.fillStyle = colors.navy;
  setFont(ctx, `800 32px ${SANS}`);
  lines.title.forEach((line, index) => ctx.fillText(line, BODY_X, CARD_Y + CARD_PAD + 26 + index * TITLE_LINE));
  let y = CARD_Y + CARD_PAD + lines.title.length * TITLE_LINE + 22;
  ctx.fillStyle = colors.jet;
  setFont(ctx, `700 22px ${SANS}`);
  ctx.fillText("¿QUÉ HACES?", BODY_X, y);
  y += 38;
  lines.options.forEach((option, index) => {
    y = drawOption(ctx, colors, option, index, card.chosen, y);
  });
  ctx.fillStyle = card.chosen === null ? colors.muted : colors.carbon;
  setFont(ctx, `700 20px ${SANS}`);
  ctx.fillText(card.chosen === null ? "PULSA 1, 2 O 3" : "DECISIÓN REGISTRADA", BODY_X, y + 12);
};

/** Dibuja todo el grafismo sobre un lienzo transparente. */
export const drawBroadcastOverlay = (ctx: CanvasRenderingContext2D, state: OverlayState): void => {
  const colors = palette();
  ctx.clearRect(0, 0, OVERLAY_SIZE.width, OVERLAY_SIZE.height);
  ctx.textBaseline = "alphabetic";
  drawLiveBar(ctx, colors, state.recording);
  drawCountdown(ctx, colors, state.remainingS);
  drawLowerThird(ctx, colors, state);
  if (state.card) drawCard(ctx, colors, state.card);
};
