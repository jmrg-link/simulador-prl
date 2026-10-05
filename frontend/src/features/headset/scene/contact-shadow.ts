/**
 * Sombra de contacto horneada en Blender (`blender/common.py`, `contact_shadow`): un plano de suelo
 * blanco con la oclusión ambiental de cada objeto. Se multiplica sobre lo que hay debajo, así que el
 * blanco deja intacto el suelo de la fotografía y lo oscuro asienta los objetos en él.
 */
import { Mesh, MeshBasicMaterial, MultiplyBlending, type MeshStandardMaterial, type Object3D } from "three";

/** Nombre del plano con la sombra horneada dentro de `workshop.glb`. */
export const CONTACT_SHADOW_NAME = "SombraContacto";

/** Material que multiplica la textura horneada sobre el fondo, sin luz, sin tone mapping y sin escribir profundidad. */
const multiplyMaterial = (source: MeshStandardMaterial): MeshBasicMaterial =>
  new MeshBasicMaterial({
    map: source.map,
    blending: MultiplyBlending,
    transparent: true,
    premultipliedAlpha: true,
    toneMapped: false,
    depthWrite: false,
  });

/**
 * Convierte el plano de sombra de `root` en una capa que se multiplica sobre el suelo y lo saca de
 * las sombras en tiempo real.
 *
 * @returns El plano preparado, o `null` si el modelo no lo trae.
 */
export const prepareContactShadow = (root: Object3D): Mesh | null => {
  const plane = root.getObjectByName(CONTACT_SHADOW_NAME);
  if (!(plane instanceof Mesh)) return null;
  plane.material = multiplyMaterial(plane.material as MeshStandardMaterial);
  plane.castShadow = false;
  plane.receiveShadow = false;
  plane.renderOrder = 1;
  return plane;
};
