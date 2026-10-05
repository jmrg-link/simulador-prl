/**
 * Carga de los modelos generados con Blender (`blender/build_all.py`) y preparación para la escena:
 * sombras, riesgos marcados para el raycast y materiales propios para poder iluminarlos.
 */
import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import { Mesh, Vector3, type Material, type MeshStandardMaterial, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

/** Rutas de los modelos servidos desde `public/`. */
export const MODEL_URLS = {
  workshop: "/models/workshop.glb",
  trainee: "/models/trainee.glb",
  goggles: "/models/goggles.glb",
  environment: "/models/workshop.hdr",
} as const;

const HAZARD_PREFIX = "Hazard_";

/** Riesgo del modelo: su nodo raíz y los materiales que se iluminan al mirarlo. */
export interface HazardNode {
  id: string;
  root: Object3D;
  materials: MeshStandardMaterial[];
}

/** Taller preparado para la escena. */
export interface PreparedWorkshop {
  scene: Object3D;
  hazards: HazardNode[];
  spark: Vector3 | null;
}

/** Registra el decodificador de EXT_meshopt_compression, con el que exporta Blender. */
const withMeshopt = (loader: GLTFLoader): void => {
  loader.setMeshoptDecoder(MeshoptDecoder);
};

/** Activa sombras proyectadas y recibidas en todas las mallas. */
const enableShadows = (root: Object3D): void => {
  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
};

/** Clona los materiales de las mallas bajo `root` para iluminarlas sin afectar a otras piezas. */
const ownMaterials = (root: Object3D): MeshStandardMaterial[] => {
  const materials: MeshStandardMaterial[] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const material = (object.material as Material).clone() as MeshStandardMaterial;
    object.material = material;
    materials.push(material);
  });
  return materials;
};

/** Marca cada nodo `Hazard_<id>` con su `hazardId` y reúne sus materiales. */
const collectHazards = (scene: Object3D): HazardNode[] => {
  const hazards: HazardNode[] = [];
  scene.traverse((object) => {
    if (!object.name.startsWith(HAZARD_PREFIX)) return;
    const id = object.name.slice(HAZARD_PREFIX.length);
    object.userData.hazardId = id;
    hazards.push({ id, root: object, materials: ownMaterials(object) });
  });
  return hazards;
};

/** Posición mundial del vacío `Spark`, donde salta la chispa del cable. */
const sparkPosition = (scene: Object3D): Vector3 | null => {
  scene.updateMatrixWorld(true);
  return scene.getObjectByName("Spark")?.getWorldPosition(new Vector3()) ?? null;
};

/** Taller cargado y preparado una sola vez. Suspende hasta que el .glb termina de cargar. */
export const useWorkshop = (): PreparedWorkshop => {
  const gltf = useLoader(GLTFLoader, MODEL_URLS.workshop, withMeshopt);
  return useMemo(() => {
    enableShadows(gltf.scene);
    return { scene: gltf.scene, hazards: collectHazards(gltf.scene), spark: sparkPosition(gltf.scene) };
  }, [gltf]);
};

/** Escena de un modelo con sombras activadas. */
export const useModel = (url: string): Object3D => {
  const gltf = useLoader(GLTFLoader, url, withMeshopt);
  return useMemo(() => {
    enableShadows(gltf.scene);
    return gltf.scene;
  }, [gltf]);
};
