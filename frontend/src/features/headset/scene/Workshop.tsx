/**
 * Taller dentro de la nave de la fotografía: la panorámica proyectada con suelo hace de entorno
 * visible, el HDR de la misma captura ilumina y da reflejos, una luz direccional proyecta sombras
 * sobre el suelo de la foto, y los riesgos se iluminan según se miran o se identifican.
 */
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, EquirectangularReflectionMapping, SRGBColorSpace, TextureLoader, type Mesh, type Scene, type Texture } from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { GroundedSkybox } from "three/addons/objects/GroundedSkybox.js";
import { themeColor } from "../../../shared/ui/theme.ts";
import { MODEL_URLS, type HazardNode, type PreparedWorkshop } from "./models.ts";

const ENVIRONMENT_INTENSITY = 0.9;
/** Altura en metros a la que estaba la cámara que tomó la panorámica; fija la escala del suelo proyectado. */
const CAPTURE_HEIGHT = 1.7;
/** Radio de la cúpula del fondo; tiene que quedar dentro del plano lejano de la cámara. */
const SKYBOX_RADIUS = 40;
const SHADOW_OPACITY = 0.35;

/** Instala el HDRI como entorno de la escena y devuelve la función que lo retira. */
const installEnvironment = (scene: Scene, texture: Texture): (() => void) => {
  texture.mapping = EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.environmentIntensity = ENVIRONMENT_INTENSITY;
  return () => {
    scene.environment = null;
  };
};

/** Entorno HDRI que ilumina y da reflejos a los materiales PBR. */
const Environment = () => {
  const texture = useLoader(HDRLoader, MODEL_URLS.environment);
  const scene = useThree((state) => state.scene);
  useEffect(() => installEnvironment(scene, texture), [scene, texture]);
  return null;
};

/** Cúpula con la panorámica ya tonemapeada y el suelo plano en y = 0, sin volver a pasar por el tone mapping. */
const createSkybox = (texture: Texture): GroundedSkybox => {
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  const skybox = new GroundedSkybox(texture, CAPTURE_HEIGHT, SKYBOX_RADIUS);
  skybox.material.toneMapped = false;
  skybox.position.y = CAPTURE_HEIGHT - 0.01;
  return skybox;
};

/**
 * Nave de la fotografía como entorno visible. La cúpula sigue a la cámara en horizontal porque la
 * proyección solo se ve recta desde el punto de captura: así la tercera persona de la intro no curva
 * las paredes, y en primera persona, con la cámara en el origen, no cambia nada.
 */
const Background = () => {
  const texture = useLoader(TextureLoader, MODEL_URLS.background);
  const skybox = useMemo(() => createSkybox(texture), [texture]);
  const ref = useRef<GroundedSkybox>(null);
  useFrame(({ camera }) => {
    ref.current?.position.set(camera.position.x, CAPTURE_HEIGHT - 0.01, camera.position.z);
  });
  return <primitive ref={ref} object={skybox} />;
};

/** Plano invisible que solo recibe las sombras en tiempo real sobre el suelo de la fotografía. */
const ShadowCatcher = () => (
  <mesh rotation-x={-Math.PI / 2} position-y={0.001} receiveShadow>
    <planeGeometry args={[SKYBOX_RADIUS, SKYBOX_RADIUS]} />
    <shadowMaterial opacity={SHADOW_OPACITY} />
  </mesh>
);

/** Chispa que parpadea en el extremo del cable pelado, con su luz. */
const Spark = ({ position }: { position: [number, number, number] }) => {
  const mesh = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (mesh.current) mesh.current.visible = Math.sin(clock.elapsedTime * 31) * Math.sin(clock.elapsedTime * 7) > 0.15;
  });
  return (
    <group position={position}>
      <mesh ref={mesh}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshBasicMaterial color="#fff6c2" toneMapped={false} />
      </mesh>
      <pointLight color="#ffd27a" intensity={0.6} distance={1.5} />
    </group>
  );
};

/** Aplica el realce de cada riesgo: carbón si se identificó, rojo mientras se mira. */
const applyHighlight = (hazards: HazardNode[], gazed: string | null, detected: ReadonlySet<string>): void => {
  const carbon = new Color(themeColor("carbon"));
  const jet = new Color(themeColor("jet"));
  for (const hazard of hazards) {
    const tone = detected.has(hazard.id) ? carbon : hazard.id === gazed ? jet : null;
    for (const material of hazard.materials) {
      material.emissive.copy(tone ?? new Color(0, 0, 0));
      material.emissiveIntensity = tone ? 0.55 : 0;
    }
  }
};

/** Props del taller. */
interface WorkshopProps {
  workshop: PreparedWorkshop;
  gazed: string | null;
  detected: ReadonlySet<string>;
}

/** Nave, mobiliario y riesgos con su iluminación y sus sombras. */
export const Workshop = ({ workshop, gazed, detected }: WorkshopProps) => {
  useEffect(() => applyHighlight(workshop.hazards, gazed, detected), [workshop, gazed, detected]);
  return (
    <>
      <Environment />
      <Background />
      <ShadowCatcher />
      <directionalLight
        position={[3, 9, -9]}
        intensity={2.2}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <primitive object={workshop.scene} />
      {workshop.spark && <Spark position={workshop.spark.toArray()} />}
    </>
  );
};
