"""Operario y visor de realidad virtual.

El cuerpo se modela con el modificador Skin sobre un esqueleto de aristas y se subdivide, que da
volúmenes orgánicos continuos en lugar de primitivas encajadas. Medidas de una persona de 1,78 m
con los ojos a 1,65 m; mira a +Y y sostiene el visor delante del pecho, a la altura donde lo
recoge la animación del frontal.
"""

import math

import bmesh
import bpy

import polyhaven as ph
from common import box, box_project, lathe, material, parent_all, sphere, textured_material, to_mesh, tube

Joint = tuple[float, float, float]

JOINTS: dict[str, tuple[Joint, tuple[float, float]]] = {
    "pelvis": ((0, 0, 0.95), (0.16, 0.11)),
    "spine": ((0, 0, 1.15), (0.15, 0.1)),
    "chest": ((0, 0.01, 1.34), (0.18, 0.11)),
    "neck": ((0, 0, 1.5), (0.055, 0.055)),
    "hip_l": ((-0.1, 0, 0.9), (0.085, 0.085)),
    "knee_l": ((-0.11, 0.02, 0.5), (0.062, 0.062)),
    "ankle_l": ((-0.11, 0, 0.12), (0.048, 0.048)),
    "hip_r": ((0.1, 0, 0.9), (0.085, 0.085)),
    "knee_r": ((0.11, 0.02, 0.5), (0.062, 0.062)),
    "ankle_r": ((0.11, 0, 0.12), (0.048, 0.048)),
    "shoulder_l": ((-0.21, 0, 1.41), (0.058, 0.058)),
    "elbow_l": ((-0.2, 0.16, 1.13), (0.045, 0.045)),
    "wrist_l": ((0.1, 0.3, 1.05), (0.034, 0.03)),
    "shoulder_r": ((0.21, 0, 1.41), (0.058, 0.058)),
    "elbow_r": ((0.3, 0.12, 1.14), (0.045, 0.045)),
    "wrist_r": ((0.42, 0.3, 1.05), (0.034, 0.03)),
}

BODY_EDGES = [("pelvis", "spine"), ("spine", "chest"), ("chest", "neck"),
              ("pelvis", "hip_l"), ("hip_l", "knee_l"), ("knee_l", "ankle_l"),
              ("pelvis", "hip_r"), ("hip_r", "knee_r"), ("knee_r", "ankle_r"),
              ("chest", "shoulder_l"), ("shoulder_l", "elbow_l"), ("elbow_l", "wrist_l"),
              ("chest", "shoulder_r"), ("shoulder_r", "elbow_r"), ("elbow_r", "wrist_r")]


def skinned(name: str, joints: dict[str, tuple[Joint, tuple[float, float]]], edges: list[tuple[str, str]],
            mat: bpy.types.Material, root: str, inflate: float = 0.0, levels: int = 2) -> bpy.types.Object:
    """Malla orgánica a partir de un esqueleto: Skin con los radios de cada articulación y subdivisión."""
    mesh = bpy.data.meshes.new(name)
    used = sorted({joint for edge in edges for joint in edge})
    index = {joint: i for i, joint in enumerate(used)}
    mesh.from_pydata([joints[j][0] for j in used], [(index[a], index[b]) for a, b in edges], [])
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.modifiers.new("Skin", "SKIN")
    for joint, vertex in zip(used, mesh.skin_vertices[0].data):
        rx, ry = joints[joint][1]
        vertex.radius = (rx + inflate, ry + inflate)
        vertex.use_root = joint == root
    subdivision = obj.modifiers.new("Subdivision", "SUBSURF")
    subdivision.levels = levels
    obj.data.materials.append(mat)
    return to_mesh(obj)


def clearcoat(mat: bpy.types.Material, weight: float = 0.8, roughness: float = 0.08) -> bpy.types.Material:
    """Añade capa de barniz (KHR_materials_clearcoat en glTF), para plásticos inyectados brillantes."""
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Coat Weight"].default_value = weight
    bsdf.inputs["Coat Roughness"].default_value = roughness
    return mat


def reflective_band(name: str, z: float, radii: tuple[float, float], mat: bpy.types.Material) -> bpy.types.Object:
    """Banda reflectante elíptica alrededor del torso, sin tapas."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    steps = 48
    rings = [[bm.verts.new((radii[0] * math.cos(math.tau * s / steps), radii[1] * math.sin(math.tau * s / steps), z + dz))
              for s in range(steps)] for dz in (-0.022, 0.022)]
    for s in range(steps):
        bm.faces.new((rings[0][s], rings[0][(s + 1) % steps], rings[1][(s + 1) % steps], rings[1][s]))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def trainee() -> str:
    """Operario con buzo de trabajo, chaleco de alta visibilidad, casco, guantes y botas de seguridad."""
    coverall = textured_material("Buzo", ph.texture("denim_fabric"), normal_strength=0.8)
    vest = textured_material("Chaleco", ph.texture("fabric_pattern_07"), base_color=(1.0, 0.45, 0.04), normal_strength=0.5)
    stripe = material("Reflectante", (0.85, 0.87, 0.9), roughness=0.18, metallic=0.85)
    skin = material("Piel", (0.86, 0.64, 0.5), roughness=0.5)
    gloves = textured_material("Guantes", ph.texture("fabric_leather_01"), base_color=(0.3, 0.3, 0.32), normal_strength=0.6)
    boots = textured_material("Botas", ph.texture("fabric_leather_02"), base_color=(0.07, 0.06, 0.05), normal_strength=0.7)
    helmet = clearcoat(material("Casco", (0.98, 0.8, 0.06), roughness=0.3))
    parts = [box_project(skinned("Cuerpo", JOINTS, BODY_EDGES, coverall, root="pelvis"), 0.5)]
    vest_edges = [("pelvis", "spine"), ("spine", "chest"), ("chest", "shoulder_l"), ("chest", "shoulder_r")]
    parts.append(box_project(skinned("Chaleco", JOINTS, vest_edges, vest, root="spine", inflate=0.018), 0.4))
    parts += [reflective_band(f"Banda_{z}", z, (0.19, 0.135), stripe) for z in (1.12, 1.27)]
    for side, x in (("l", -0.11), ("r", 0.11)):
        foot = {f"ankle_{side}": ((x, 0, 0.13), (0.055, 0.055)), f"toe_{side}": ((x, 0.17, 0.05), (0.055, 0.04)), f"heel_{side}": ((x, -0.04, 0.05), (0.05, 0.04))}
        parts.append(box_project(skinned(f"Bota_{side}", foot, [(f"heel_{side}", f"ankle_{side}"), (f"ankle_{side}", f"toe_{side}")], boots, root=f"ankle_{side}"), 0.3))
    for side, wrist in (("l", JOINTS["wrist_l"][0]), ("r", JOINTS["wrist_r"][0])):
        parts.append(sphere(f"Guante_{side}", 0.048, (wrist[0], wrist[1] + 0.05, wrist[2]), gloves, scale=(0.8, 1.3, 0.7)))
    parts.append(sphere("Cabeza", 0.105, (0, 0.01, 1.655), skin, scale=(0.9, 1.0, 1.14)))
    parts.append(sphere("Nariz", 0.022, (0, 0.11, 1.64), skin, scale=(0.7, 1.0, 1.2)))
    parts.append(lathe("Casco", [(0.0, 1.86), (0.05, 1.857), (0.095, 1.84), (0.122, 1.8), (0.133, 1.755), (0.132, 1.735)], helmet))
    parts.append(lathe("Ala", [(0.128, 1.735), (0.165, 1.728), (0.168, 1.722), (0.128, 1.726)], helmet))
    parts.append(box("Cresta", (0.03, 0.22, 0.03), (0, 0.0, 1.835), helmet, bevel=0.012))
    parent_all("Alumno", parts)
    return "trainee.glb"


def goggles() -> str:
    """Visor autónomo: carcasa blanca, frontal negro brillante con cuatro cámaras, espuma facial y cintas."""
    shell = clearcoat(material("CarcasaVisor", (0.93, 0.94, 0.95), roughness=0.35), weight=0.5, roughness=0.15)
    front = clearcoat(material("FrontalVisor", (0.02, 0.02, 0.025), roughness=0.05, metallic=0.1), weight=1.0, roughness=0.03)
    foam = textured_material("Espuma", ph.texture("fabric_pattern_07"), base_color=(0.07, 0.07, 0.08), normal_strength=0.6)
    lens = material("Camara", (0.02, 0.02, 0.03), roughness=0.05, emission=(0.25, 0.5, 1.0), emission_strength=0.8)
    strap = material("Cinta", (0.1, 0.1, 0.11), roughness=0.8)
    body = box("Carcasa", (0.19, 0.1, 0.11), (0, -0.01, -0.055), shell, bevel=0.032)
    body.modifiers["Bevel"].segments = 6
    plate = box("Frontal", (0.172, 0.014, 0.088), (0, 0.042, -0.044), front, bevel=0.026)
    plate.modifiers["Bevel"].segments = 6
    face = box_project(box("EspumaFacial", (0.18, 0.035, 0.1), (0, -0.075, -0.05), foam, bevel=0.025), 0.2)
    cams = [sphere(f"Camara_{x}_{z}", 0.006, (x, 0.05, z), lens) for x in (-0.068, 0.068) for z in (-0.028, 0.028)]
    side = tube("CintaLateral", [(-0.093, -0.06, 0.0), (-0.12, -0.15, 0.01), (0.0, -0.235, 0.02), (0.12, -0.15, 0.01), (0.093, -0.06, 0.0)], 0.013, strap)
    top = tube("CintaSuperior", [(0, -0.07, 0.05), (0, -0.14, 0.115), (0, -0.215, 0.05)], 0.011, strap)
    parent_all("Gafas", [body, plate, face, side, top, *cams])
    return "goggles.glb"

