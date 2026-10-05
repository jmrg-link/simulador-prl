/**
 * Controlador de la experiencia de gafas. Tiene dos fases: la secuencia en tercera persona en la
 * que el avatar se pone las gafas y la vista inmersiva en primera persona. En esta última dibuja
 * el HUD de la lente y detecta riesgos por mirada sostenida. Todo lo que se ve, HUD y grafismo de
 * emisión incluidos, se pinta en el canvas WebGL, así que viaja tal cual por WebRTC y por RTMP.
 */
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Raycaster, Vector2, type Camera, type Group, type Mesh, type MeshBasicMaterial, type Object3D, type Texture, type Scene } from "three";
import type { Hazard } from "../../../shared/api/schemas.ts";
import { couponCode } from "../../../shared/coupon-code.ts";
import { themeColor } from "../../../shared/ui/theme.ts";
import { GazeTracker } from "../gaze-tracker.ts";
import type { DecisionCard } from "./broadcast-overlay.ts";
import { INTRO_DURATION_S, poseIntro } from "./intro.ts";
import { applyLook, bindLookControls, type Look } from "./look-controls.ts";
import { createLensVignette } from "./textures.ts";
import { MODEL_URLS, useModel } from "./models.ts";
import { useOverlayTexture } from "./useOverlayTexture.ts";

const DWELL_MS = 1_200;
const HUD_DISTANCE = 0.5;
const CENTER = new Vector2(0, 0);

/** Riesgo en decisión: el último identificado y la opción elegida, si ya la hay. */
export interface PendingDecision {
  hazardId: string;
  chosen: number | null;
}

/** Props del controlador. */
interface HeadsetRigProps {
  hazardRoots: Object3D[];
  /** Escena aparte donde se monta el HUD para que el desenfoque no le afecte. */
  hud: Scene;
  hazards: Hazard[];
  detectedCount: number;
  traineeName: string;
  scenarioTitle: string;
  recording: boolean;
  remainingS: number;
  decision: PendingDecision | null;
  onGazeChange(hazardId: string | null): void;
  onDetect(hazardId: string, reactionMs: number): void;
}

/** Referencias a los objetos del HUD que se actualizan en cada fotograma. */
interface HudRefs {
  group: RefObject<Group | null>;
  reticle: RefObject<Group | null>;
  progress: RefObject<Mesh | null>;
  vignette: RefObject<MeshBasicMaterial | null>;
}

/** Estado del HUD en un fotograma. */
interface HudFrame {
  vignetteOpacity: number;
  reticleVisible: boolean;
  progress: number;
}

/** Sube por los padres hasta encontrar el `hazardId` del grupo que envuelve cada riesgo. */
const hazardIdOf = (object: Object3D | null): string | null => {
  if (!object) return null;
  const id: unknown = object.userData.hazardId;
  return typeof id === "string" ? id : hazardIdOf(object.parent);
};

/** Lanza el rayo desde el centro de la vista contra los riesgos y devuelve el que toca, si alguno. */
const gazedHazard = (raycaster: Raycaster, camera: Camera, roots: Object3D[]): string | null => {
  raycaster.setFromCamera(CENTER, camera);
  const [hit] = raycaster.intersectObjects(roots, true);
  return hazardIdOf(hit?.object ?? null);
};

/** Pega el HUD a la cámara y aplica el estado del fotograma. */
const syncHud = (hud: HudRefs, camera: Camera, frame: HudFrame): void => {
  hud.group.current?.position.copy(camera.position);
  hud.group.current?.quaternion.copy(camera.quaternion);
  if (hud.vignette.current) hud.vignette.current.opacity = frame.vignetteOpacity;
  if (hud.reticle.current) hud.reticle.current.visible = frame.reticleVisible;
  hud.progress.current?.scale.setScalar(frame.progress);
};

/** Muestra el avatar y las gafas solo mientras la cámara está fuera de su cabeza. */
const setAvatarVisible = (visible: boolean, ...objects: Array<Object3D | null>): void => {
  for (const object of objects) if (object) object.visible = visible;
};

/** Tarjeta de decisión del riesgo en curso, o `null` si no hay ninguno. */
const toCard = (hazards: Hazard[], decision: PendingDecision | null): DecisionCard | null => {
  const index = decision ? hazards.findIndex(({ id }) => id === decision.hazardId) : -1;
  const hazard = hazards[index];
  if (!decision || !hazard) return null;
  return { code: couponCode(index), severity: hazard.severity, label: hazard.label, options: hazard.options, chosen: decision.chosen };
};

/** Props del HUD: una ref por objeto animado y la textura del grafismo. */
interface LensHudProps {
  groupRef: HudRefs["group"];
  reticleRef: HudRefs["reticle"];
  progressRef: HudRefs["progress"];
  vignetteRef: HudRefs["vignette"];
  overlay: Texture;
}

/** HUD de la lente: viñeta, retícula con progreso de mirada y grafismo de emisión a pantalla completa. */
const LensHud = ({ groupRef, reticleRef, progressRef, vignetteRef, overlay }: LensHudProps) => {
  const { camera, size } = useThree();
  const vignette = useMemo(() => createLensVignette(), []);
  const fov = "fov" in camera ? Number(camera.fov) : 70;
  const height = 2 * HUD_DISTANCE * Math.tan((fov * Math.PI) / 360);
  const width = height * (size.width / size.height);
  const cover = Math.max(width, height) * 1.15;
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, -HUD_DISTANCE - 0.02]} renderOrder={10}>
        <planeGeometry args={[cover, cover]} />
        <meshBasicMaterial ref={vignetteRef} map={vignette} transparent opacity={0} depthTest={false} depthWrite={false} />
      </mesh>
      <group ref={reticleRef} visible={false} position={[0, 0, -HUD_DISTANCE + 0.01]}>
        <mesh renderOrder={11}>
          <ringGeometry args={[0.009, 0.012, 32]} />
          <meshBasicMaterial color={themeColor("coupon")} depthTest={false} transparent />
        </mesh>
        <mesh ref={progressRef} renderOrder={12} scale={0}>
          <circleGeometry args={[0.009, 32]} />
          <meshBasicMaterial color={themeColor("jet")} depthTest={false} transparent />
        </mesh>
      </group>
      <mesh position={[0, 0, -HUD_DISTANCE]} renderOrder={13}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={overlay} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};

/** Escena del alumno con las gafas: avatar, secuencia de entrada, vista inmersiva, HUD y grafismo. */
export const HeadsetRig = (props: HeadsetRigProps) => {
  const { hazardRoots, hud, hazards, detectedCount, traineeName, scenarioTitle, recording, remainingS, decision, onGazeChange, onDetect } = props;
  const { camera, gl } = useThree();
  const overlay = useOverlayTexture();
  const body = useModel(MODEL_URLS.trainee);
  const goggles = useModel(MODEL_URLS.goggles);
  const hudGroupRef = useRef<Group>(null);
  const reticleRef = useRef<Group>(null);
  const progressRef = useRef<Mesh>(null);
  const vignetteRef = useRef<MeshBasicMaterial>(null);
  const look = useRef<Look>({ yaw: 0, pitch: 0 });
  const tracker = useRef(new GazeTracker(DWELL_MS));
  const raycaster = useRef(new Raycaster());
  const gazed = useRef<string | null>(null);
  const startedAt = useRef<number | null>(null);
  const immersiveSince = useRef<number | null>(null);

  useEffect(() => bindLookControls(gl.domElement, look.current), [gl]);

  useFrame(({ clock }) => {
    const hud: HudRefs = { group: hudGroupRef, reticle: reticleRef, progress: progressRef, vignette: vignetteRef };
    startedAt.current ??= clock.elapsedTime;
    const elapsed = clock.elapsedTime - startedAt.current;
    const immersive = elapsed >= INTRO_DURATION_S;
    const card = toCard(hazards, decision);
    overlay.draw({ traineeName, scenarioTitle, remainingS, detected: detectedCount, total: hazards.length, immersive, recording, card });
    setAvatarVisible(!immersive, body, goggles);
    if (!immersive) {
      const { dolly } = poseIntro(elapsed, camera, goggles);
      return syncHud(hud, camera, { vignetteOpacity: dolly, reticleVisible: false, progress: 0 });
    }
    immersiveSince.current ??= clock.elapsedTime;
    applyLook(camera, look.current);
    const nowMs = clock.elapsedTime * 1000;
    const target = decision ? null : gazedHazard(raycaster.current, camera, hazardRoots);
    const update = tracker.current.update(target, nowMs);
    syncHud(hud, camera, { vignetteOpacity: 1, reticleVisible: true, progress: update.progress });
    if (update.target !== gazed.current) {
      gazed.current = update.target;
      onGazeChange(update.target);
    }
    if (update.detected) onDetect(update.detected, Math.round(nowMs - immersiveSince.current * 1000));
  });

  return (
    <>
      <primitive object={body} />
      <primitive object={goggles} />
      {createPortal(
        <LensHud groupRef={hudGroupRef} reticleRef={reticleRef} progressRef={progressRef} vignetteRef={vignetteRef} overlay={overlay.texture} />,
        hud,
      )}
    </>
  );
};
