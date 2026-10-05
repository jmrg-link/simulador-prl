import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from "three";
import { addGazeZone, GAZE_MARGIN } from "../src/features/headset/scene/gaze-zones.ts";

/** Riesgo con una sola pieza fina, como un cable de 2 cm, colocada lejos del origen. */
const thinHazard = (): Group => {
  const root = new Group();
  root.position.set(3, 0, -4);
  const cable = new Mesh(new BoxGeometry(1, 0.02, 0.02), new MeshStandardMaterial());
  cable.position.set(0, 0.05, 0);
  root.add(cable);
  return root;
};

/** Rayo vertical hacia abajo que pasa a `offset` metros del cable, por delante de él. */
const rayBeside = (offset: number): Raycaster =>
  new Raycaster(new Vector3(3, 2, -4 + offset), new Vector3(0, -1, 0));

describe("addGazeZone", () => {
  it("hace que la mirada encuentre un riesgo fino aunque no caiga justo encima", () => {
    const root = thinHazard();
    expect(rayBeside(0.2).intersectObject(root, true)).toHaveLength(0);
    addGazeZone(root);
    expect(rayBeside(0.2).intersectObject(root, true)).not.toHaveLength(0);
  });

  it("no amplía más allá del margen", () => {
    const root = thinHazard();
    addGazeZone(root);
    expect(rayBeside(GAZE_MARGIN + 0.05).intersectObject(root, true)).toHaveLength(0);
  });

  it("es invisible y no proyecta sombra", () => {
    const zone = addGazeZone(thinHazard());
    expect(zone?.material).toHaveProperty("visible", false);
    expect(zone?.castShadow).toBe(false);
  });

  it("devuelve null si el riesgo no tiene piezas", () => {
    expect(addGazeZone(new Group())).toBeNull();
  });
});

describe("addGazeZone con un modelo reutilizado", () => {
  it("no añade una segunda zona si el riesgo ya la tiene", () => {
    const root = thinHazard();
    const first = addGazeZone(root);
    expect(addGazeZone(root)).toBe(first);
    expect(root.children.filter((child) => child.name === "ZonaMirada")).toHaveLength(1);
  });
});
