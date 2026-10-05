/**
 * Enfoque de las gafas: profundidad de campo con BokehPass cuyo plano de foco sigue a lo que mira
 * el alumno. Es deliberadamente sutil: la pantalla de unas gafas reales es nítida entera, así que
 * solo se suaviza lo muy alejado del foco. La escena se pinta con multimuestreo para conservar el
 * antialiasing que el composer, por sí solo, perdería. Toma el render de R3F (prioridad 1): pinta la escena
 * con el composer y después, sin desenfoque, la escena del HUD encima, porque BokehPass desenfoca
 * todo lo que pertenece a la escena que procesa.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { HalfFloatType, Raycaster, Vector2, WebGLRenderTarget, type Camera, type Object3D, type Scene, type WebGLRenderer } from "three";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";

const APERTURE = 0.0008;
const MAX_BLUR = 0.0025;
const MSAA_SAMPLES = 4;
const DEFAULT_FOCUS_M = 4;
const PROBE_EVERY_S = 0.15;
const FOCUS_EASE = 6;
const CENTER = new Vector2(0, 0);

/** Uniforme de foco de BokehPass, en metros a lo largo de la dirección de la cámara. */
type FocusUniforms = { focus: { value: number } };

/** Cadena RenderPass → BokehPass → OutputPass sobre el renderer de R3F, con el HUD encima. */
class FocusPipeline {
  readonly #composer: EffectComposer;
  readonly #bokeh: BokehPass;

  /** Monta la cadena; OutputPass va el último para aplicar tone mapping y sRGB una sola vez. */
  constructor(gl: WebGLRenderer, scene: Scene, camera: Camera) {
    const size = gl.getDrawingBufferSize(new Vector2());
    this.#composer = new EffectComposer(gl, new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType, samples: MSAA_SAMPLES }));
    this.#bokeh = new BokehPass(scene, camera, { focus: DEFAULT_FOCUS_M, aperture: APERTURE, maxblur: MAX_BLUR });
    this.#composer.addPass(new RenderPass(scene, camera));
    this.#composer.addPass(this.#bokeh);
    this.#composer.addPass(new OutputPass());
  }

  /** Coloca el plano de foco a `meters` de la cámara. */
  focusAt(meters: number): void {
    (this.#bokeh.uniforms as unknown as FocusUniforms).focus.value = meters;
  }

  /** Ajusta los render targets al tamaño del lienzo y a la densidad de píxeles de la pantalla. */
  resize(width: number, height: number, pixelRatio: number): void {
    this.#composer.setPixelRatio(pixelRatio);
    this.#composer.setSize(width, height);
  }

  /** Pinta la escena enfocada y, encima y nítido, el HUD con la misma cámara. */
  render(gl: WebGLRenderer, hud: Scene, camera: Camera): void {
    this.#composer.render();
    gl.autoClear = false;
    gl.clearDepth();
    gl.render(hud, camera);
    gl.autoClear = true;
  }

  /** Libera los render targets. */
  dispose(): void {
    this.#composer.dispose();
  }
}

/** Distancia al primer objeto en el centro de la vista, o `null` si no hay ninguno. */
const probeDistance = (raycaster: Raycaster, camera: Camera, targets: Object3D[]): number | null => {
  raycaster.setFromCamera(CENTER, camera);
  return raycaster.intersectObjects(targets, true)[0]?.distance ?? null;
};

/** Estado del enfoque: distancia buscada, distancia actual y último sondeo. */
interface FocusState {
  target: number;
  current: number;
  probedAt: number;
}

/**
 * Sondea la distancia de la mirada cada cierto tiempo y acerca el foco actual al buscado con una
 * curva exponencial, como el acomodo del ojo. Devuelve el foco a aplicar en este fotograma.
 */
const stepFocus = (state: FocusState, now: number, delta: number, probe: () => number | null): number => {
  if (now - state.probedAt > PROBE_EVERY_S) {
    state.probedAt = now;
    state.target = probe() ?? state.target;
  }
  state.current += (state.target - state.current) * Math.min(1, delta * FOCUS_EASE);
  return state.current;
};

/** Profundidad de campo con foco en la mirada y HUD nítido encima. */
export const FocusComposer = ({ hud, targets }: { hud: Scene; targets: Object3D[] }) => {
  const { gl, scene, camera, size, viewport } = useThree();
  const pipeline = useMemo(() => new FocusPipeline(gl, scene, camera), [gl, scene, camera]);
  const raycaster = useRef(new Raycaster());
  const focus = useRef<FocusState>({ target: DEFAULT_FOCUS_M, current: DEFAULT_FOCUS_M, probedAt: 0 });

  useEffect(() => pipeline.resize(size.width, size.height, viewport.dpr), [pipeline, size, viewport.dpr]);
  useEffect(() => () => pipeline.dispose(), [pipeline]);

  useFrame(({ clock }, delta) => {
    pipeline.focusAt(stepFocus(focus.current, clock.elapsedTime, delta, () => probeDistance(raycaster.current, camera, targets)));
    pipeline.render(gl, hud, camera);
  }, 1);

  return null;
};
