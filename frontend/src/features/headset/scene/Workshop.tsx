/**
 * Taller modelado en Blender: iluminación por HDRI de un taller real, sol a través de los
 * ventanales con sombras, y los riesgos iluminados según se miran o se identifican.
 */
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Color, EquirectangularReflectionMapping, type Mesh, type Scene, type Texture } from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { themeColor } from "../../../shared/ui/theme.ts";
import { MODEL_URLS, type HazardNode, type PreparedWorkshop } from "./models.ts";

const ENVIRONMENT_INTENSITY = 0.9;

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

/** Nave, mobiliario y riesgos con su iluminación. */
export const Workshop = ({ workshop, gazed, detected }: WorkshopProps) => {
  useEffect(() => applyHighlight(workshop.hazards, gazed, detected), [workshop, gazed, detected]);
  return (
    <>
      <Environment />
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
