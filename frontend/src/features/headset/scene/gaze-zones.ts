/**
 * Zonas de mirada: una caja invisible alrededor de cada riesgo, algo mayor que sus piezas, para que
 * la retícula lo encuentre sin tener que caer sobre una malla fina como el cable. No cambia qué se
 * evalúa, solo la puntería que hace falta.
 */
import { Box3, BoxGeometry, Matrix4, Mesh, MeshBasicMaterial, Vector3, type Object3D } from "three";

/** Margen en metros que la zona añade por cada lado a la caja que envuelve el riesgo. */
export const GAZE_MARGIN = 0.3;

/** Nombre de la malla de la zona dentro de cada riesgo. */
export const GAZE_ZONE_NAME = "ZonaMirada";

const hidden = new MeshBasicMaterial({ visible: false });

/** Caja que envuelve las piezas de `root`, en sus coordenadas locales. */
const localBounds = (root: Object3D): Box3 => {
  root.updateWorldMatrix(true, true);
  const toLocal = new Matrix4().copy(root.matrixWorld).invert();
  return new Box3().setFromObject(root).applyMatrix4(toLocal);
};

/**
 * Añade a `root` una zona invisible que la envuelve con `margin` metros de holgura. Se raycastea
 * como una pieza más del riesgo, pero no se pinta ni proyecta sombra. Es idempotente: el modelo
 * cargado se reutiliza entre sesiones y la zona ya puede estar dentro.
 *
 * @returns La zona del riesgo, o `null` si no tiene piezas con volumen.
 */
export const addGazeZone = (root: Object3D, margin = GAZE_MARGIN): Mesh | null => {
  const existing = root.getObjectByName(GAZE_ZONE_NAME);
  if (existing instanceof Mesh) return existing;
  const bounds = localBounds(root);
  if (bounds.isEmpty()) return null;
  bounds.expandByScalar(margin);
  const size = bounds.getSize(new Vector3());
  const zone = new Mesh(new BoxGeometry(size.x, size.y, size.z), hidden);
  zone.name = GAZE_ZONE_NAME;
  zone.position.copy(bounds.getCenter(new Vector3()));
  root.add(zone);
  zone.updateWorldMatrix(false, false);
  return zone;
};
