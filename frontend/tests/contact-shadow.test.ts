import { describe, expect, it } from "vitest";
import { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, MultiplyBlending, PlaneGeometry, Texture } from "three";
import { CONTACT_SHADOW_NAME, prepareContactShadow } from "../src/features/headset/scene/contact-shadow.ts";

/** Taller mínimo con el plano de sombra tal como lo exporta Blender. */
const workshopWithShadow = (map: Texture): Group => {
  const root = new Group();
  const plane = new Mesh(new PlaneGeometry(1, 1), new MeshStandardMaterial({ map }));
  plane.name = CONTACT_SHADOW_NAME;
  plane.castShadow = true;
  plane.receiveShadow = true;
  root.add(plane);
  return root;
};

describe("prepareContactShadow", () => {
  it("multiplica la sombra horneada sobre el suelo sin luz ni tone mapping", () => {
    const map = new Texture();
    const plane = prepareContactShadow(workshopWithShadow(map));
    const material = plane?.material as MeshBasicMaterial;
    expect(material).toBeInstanceOf(MeshBasicMaterial);
    expect(material.map).toBe(map);
    expect(material.blending).toBe(MultiplyBlending);
    expect(material.premultipliedAlpha).toBe(true);
    expect(material.toneMapped).toBe(false);
    expect(material.depthWrite).toBe(false);
  });

  it("saca el plano de las sombras en tiempo real", () => {
    const plane = prepareContactShadow(workshopWithShadow(new Texture()));
    expect(plane?.castShadow).toBe(false);
    expect(plane?.receiveShadow).toBe(false);
  });

  it("devuelve null si el modelo no trae el plano", () => {
    expect(prepareContactShadow(new Group())).toBeNull();
  });
});
