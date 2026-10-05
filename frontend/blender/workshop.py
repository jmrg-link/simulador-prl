"""Taller de mantenimiento completo en un solo .glb: nave, mobiliario y los cuatro riesgos.

Coordenadas de Blender (Z arriba). El alumno está en el origen mirando a +Y. Cada riesgo cuelga de
un vacío `Hazard_<id>` en el origen; el frontal usa ese nombre para el raycast de la mirada y para
iluminar solo las piezas del riesgo. El vacío `Spark` marca dónde salta la chispa del cable.
"""

import math

import bpy

import polyhaven as ph
from common import (box, box_project, cylinder, import_model, material, parent_all, puddle, rename_tree,
                    textured_material, tube)

ROOM = 16.0
HEIGHT = 6.0
PAINT_YELLOW = (0.95, 0.75, 0.08)
CRANE_YELLOW = (0.93, 0.68, 0.05)
SIGN_RED = (0.78, 0.07, 0.1)


def hazard_root(hazard_id: str) -> bpy.types.Object:
    """Vacío en el origen que agrupa las piezas de un riesgo."""
    root = bpy.data.objects.new(f"Hazard_{hazard_id}", None)
    bpy.context.collection.objects.link(root)
    return root


def attach(parent: bpy.types.Object, objects: list[bpy.types.Object]) -> None:
    """Cuelga los objetos de `parent` sin moverlos (el padre está en el origen)."""
    for obj in objects:
        obj.parent = parent


def building() -> list[bpy.types.Object]:
    """Nave: solera de hormigón, muros de bloque, cubierta de chapa, ventanales altos y pilares."""
    floor_mat = textured_material("Solera", ph.texture("garage_floor"))
    wall_mat = textured_material("Hormigon", ph.texture("concrete_wall_008"))
    cladding = textured_material("ChapaVerde", ph.texture("factory_wall"))
    roof_mat = textured_material("Chapa", ph.texture("corrugated_iron"), base_color=(0.62, 0.64, 0.66), metallic=0.8)
    glass = material("Ventanal", (0.75, 0.82, 0.9), roughness=0.1, emission=(0.82, 0.88, 0.95), emission_strength=2.5)
    steel = textured_material("AceroPilar", ph.texture("metal_plate"), base_color=(0.22, 0.27, 0.33), metallic=0.7)
    half = ROOM / 2
    parts = [box_project(box("Solera", (ROOM, ROOM, 0.1), (0, 0, -0.1), floor_mat, bevel=0), 3.0)]
    plinth = 2.5
    walls = [((ROOM, 0.25), (0, half)), ((ROOM, 0.25), (0, -half)), ((0.25, ROOM), (half, 0)), ((0.25, ROOM), (-half, 0))]
    for i, ((sx, sy), (x, y)) in enumerate(walls):
        parts.append(box_project(box(f"Zocalo_{i}", (sx, sy, plinth), (x, y, 0), wall_mat, bevel=0), 3.0))
        parts.append(box_project(box(f"Cerramiento_{i}", (sx - 0.02, sy - 0.02, HEIGHT - plinth), (x, y, plinth), cladding, bevel=0), 2.0))
    parts.append(box_project(box("Cubierta", (ROOM, ROOM, 0.05), (0, 0, HEIGHT), roof_mat, bevel=0), 2.0))
    for x in (-5.0, -1.7, 1.7, 5.0):
        parts.append(box(f"Ventanal_{x}", (2.6, 0.05, 1.3), (x, half - 0.14, 4.1), glass, bevel=0.0))
        parts.append(box(f"Marco_{x}", (2.7, 0.08, 0.08), (x, half - 0.16, 4.06), steel, bevel=0.01))
    for x in (-7.6, 7.6):
        for y in (-4.0, 4.0):
            parts.append(box_project(box(f"Pilar_{x}_{y}", (0.3, 0.3, HEIGHT), (x, y, 0), steel, bevel=0.01), 1.0))
    return parts


def floor_markings() -> list[bpy.types.Object]:
    """Señalización horizontal: vía de paso amarilla y cebreado bajo la zona de maniobra de la grúa."""
    paint = material("PinturaSuelo", PAINT_YELLOW, roughness=0.55)
    black = material("PinturaNegra", (0.04, 0.04, 0.04), roughness=0.6)
    parts = [box(f"Linea_{x}", (0.1, 13.0, 0.003), (x, 0.5, 0), paint, bevel=0) for x in (-1.3, 1.3)]
    for i in range(7):
        parts.append(box(f"Cebra_{i}", (2.4, 0.18, 0.004), (0, 3.9 + i * 0.36, 0), paint if i % 2 == 0 else black, bevel=0))
    return parts


def overhead_crane() -> list[bpy.types.Object]:
    """Puente grúa: dos pilares, viga carril en I, carro con polipasto, cables de acero y gancho."""
    yellow = textured_material("PinturaGrua", ph.texture("metal_plate"), base_color=CRANE_YELLOW, metallic=0.4)
    steel = material("CableAcero", (0.7, 0.71, 0.73), roughness=0.25, metallic=1.0)
    dark = material("Polipasto", (0.12, 0.13, 0.15), roughness=0.45, metallic=0.8)
    y, top = 5.0, 5.0
    parts = []
    for x in (-4.2, 4.2):
        parts.append(box_project(box(f"PilarGrua_{x}", (0.3, 0.3, top), (x, y, 0), yellow, bevel=0.01), 1.0))
    parts += [
        box_project(box("Viga_AlaInf", (8.8, 0.32, 0.03), (0, y, top), yellow, bevel=0.004), 1.0),
        box_project(box("Viga_Alma", (8.8, 0.03, 0.4), (0, y, top + 0.03), yellow, bevel=0.004), 1.0),
        box_project(box("Viga_AlaSup", (8.8, 0.32, 0.03), (0, y, top + 0.43), yellow, bevel=0.004), 1.0),
        box_project(box("Carro", (0.7, 0.55, 0.3), (0, y, top - 0.3), yellow, bevel=0.03), 1.0),
        cylinder("Tambor", 0.14, 0.46, (0, y, top - 0.42), dark, rotation=(math.pi / 2, 0, 0)),
        box("Motor", (0.28, 0.3, 0.28), (0.42, y, top - 0.55), dark, bevel=0.03),
    ]
    parts += [cylinder(f"Cable_{dx}", 0.01, 1.55, (dx, y, top - 1.32), steel, vertices=12) for dx in (-0.06, 0.06)]
    parts.append(box_project(box("Moton", (0.26, 0.16, 0.3), (0, y, 2.9), yellow, bevel=0.03), 1.0))
    parts.append(tube("Gancho", [(0, y, 2.9), (0, y, 2.74), (0.07, y, 2.67), (0.1, y, 2.75)], 0.024, dark))
    return parts


def pallet(location: tuple[float, float, float]) -> list[bpy.types.Object]:
    """Palé europeo de 1,2 × 0,8 m: tablas superiores, tacos y patines de contrachapado."""
    wood = textured_material("Pale", ph.texture("plywood"))
    x, y, z = location
    parts = [box_project(box(f"HL_PaleTabla_{i}", (1.2, 0.1, 0.022), (x, y - 0.35 + i * 0.175, z + 0.122), wood, bevel=0.003), 0.6) for i in range(5)]
    for dx in (-0.55, 0.0, 0.55):
        for dy in (-0.35, 0.0, 0.35):
            parts.append(box_project(box(f"HL_PaleTaco_{dx}_{dy}", (0.1, 0.1, 0.078), (x + dx, y + dy, z + 0.022), wood, bevel=0.004), 0.6))
    parts += [box_project(box(f"HL_PalePatin_{dx}", (0.1, 0.8, 0.022), (x + dx, y, z), wood, bevel=0.003), 0.6) for dx in (-0.55, 0.0, 0.55)]
    return parts


def suspended_load() -> list[bpy.types.Object]:
    """Palé con cuatro bidones de 200 l colgado de cuatro eslingas sobre la vía de paso."""
    steel = material("Eslinga", (0.55, 0.56, 0.58), roughness=0.35, metallic=1.0)
    y, base = 5.0, 1.15
    parts = pallet((0, y, base))
    for dx in (-0.25, 0.25):
        for dy in (-0.25, 0.25):
            drum = import_model(ph.model("Barrel_02"), f"HL_Bidon_{dx}_{dy}", (dx, y + dy, base + 0.144), rotation_z=dx * 3 + dy)
            rename_tree(drum, "HL_")
            parts.append(drum)
    for dx in (-0.6, 0.6):
        for dy in (-0.4, 0.4):
            parts.append(tube(f"HL_Eslinga_{dx}_{dy}", [(0.05, y, 2.72), (dx * 0.55, y + dy * 0.55, 2.3), (dx, y + dy, base + 0.1)], 0.011, steel, resolution=3))
    return parts


def electrical_panel() -> tuple[list[bpy.types.Object], list[bpy.types.Object]]:
    """Cuadro eléctrico en el muro izquierdo y cable pelado que cruza el suelo. Devuelve (fijo, riesgo)."""
    cabinet = textured_material("ChapaCuadro", ph.texture("metal_plate"), base_color=(0.74, 0.76, 0.74), metallic=0.5)
    seam = material("JuntaCuadro", (0.2, 0.21, 0.22), roughness=0.6)
    sign = material("SenalAmarilla", (0.98, 0.8, 0.05), roughness=0.45)
    ink = material("TintaSenal", (0.03, 0.03, 0.03), roughness=0.6)
    insulation = material("Aislante", (0.06, 0.06, 0.07), roughness=0.5)
    copper = material("Cobre", (0.86, 0.47, 0.24), roughness=0.22, metallic=1.0)
    x, y = -7.72, 2.0
    fixed = [
        box_project(box("Armario", (0.3, 0.8, 1.3), (x, y, 0.55), cabinet, bevel=0.02), 1.0),
        box("Maneta", (0.05, 0.03, 0.14), (x + 0.17, y + 0.3, 1.15), seam, bevel=0.01),
        box("JuntaPuerta", (0.012, 0.004, 1.2), (x + 0.152, y, 0.6), seam, bevel=0),
        cylinder("Tubo", 0.035, 0.55, (x + 0.05, y - 0.25, 0.27), seam, vertices=16),
        box("SenalFondo", (0.004, 0.24, 0.22), (x + 0.153, y, 1.95), sign, bevel=0.0),
        box("SenalRayo", (0.006, 0.03, 0.14), (x + 0.153, y, 1.98), ink, bevel=0.0, rotation=(0.35, 0, 0)),
    ]
    cable = [tube("HL_Cable", [(x + 0.1, y - 0.25, 0.04), (x + 0.6, y - 0.4, 0.035), (x + 1.2, y + 0.1, 0.035), (x + 1.7, y + 0.25, 0.035)], 0.024, insulation)]
    end = (x + 1.7, y + 0.25, 0.035)
    for i, angle in enumerate((-0.5, 0.0, 0.5)):
        tip = (end[0] + 0.12 * math.cos(angle), end[1] + 0.12 * math.sin(angle), 0.04)
        cable.append(tube(f"HL_Cobre_{i}", [end, tip], 0.006, copper, resolution=2))
    spark = bpy.data.objects.new("Spark", None)
    bpy.context.collection.objects.link(spark)
    spark.location = (end[0] + 0.14, end[1], 0.08)
    return fixed, [*cable, spark]


def oil_spill() -> tuple[list[bpy.types.Object], list[bpy.types.Object]]:
    """Charco de aceite brillante junto a un bidón metálico. Devuelve (fijo, riesgo)."""
    oil = material("Aceite", (0.16, 0.1, 0.04), roughness=0.04, metallic=0.55)
    drum = import_model(ph.model("Barrel_01"), "Bidon", (4.8, 2.1, 0), rotation_z=0.4)
    return [drum], [puddle("HL_Charco", 0.7, oil, (3.5, 2.5, 0.006))]


def blocked_extinguisher() -> tuple[list[bpy.types.Object], list[bpy.types.Object]]:
    """Extintor junto al muro derecho con su señal, tapado por cajas de cartón. Devuelve (fijo, riesgo)."""
    sign = material("SenalExtintor", SIGN_RED, roughness=0.5)
    white = material("Pictograma", (0.97, 0.97, 0.97), roughness=0.5)
    x, y = 7.62, -3.0
    extinguisher = import_model(ph.model("korean_fire_extinguisher_01"), "HL_Extintor", (x - 0.1, y, 0), rotation_z=math.pi / 2)
    rename_tree(extinguisher, "HL_")
    fixed = [
        box("SenalExtintor", (0.01, 0.32, 0.32), (x + 0.11, y, 1.2), sign, bevel=0.0),
        box("PictogramaCuerpo", (0.012, 0.07, 0.14), (x + 0.1, y + 0.02, 1.28), white, bevel=0.0),
        box("PictogramaFlecha", (0.012, 0.12, 0.025), (x + 0.1, y - 0.05, 1.42), white, bevel=0.0),
    ]
    stack = [((x - 0.65, y + 0.05, 0), 0.1), ((x - 0.65, y - 0.5, 0), -0.12), ((x - 0.62, y - 0.2, 0.34), 0.05), ((x - 1.15, y + 0.15, 0), 0.3)]
    for i, (location, rotation) in enumerate(stack):
        fixed.append(import_model(ph.model("cardboard_box_01"), f"Caja_{i}", location, rotation_z=rotation, max_texture=512))
    return fixed, [extinguisher]


def furniture() -> list[bpy.types.Object]:
    """Banco de trabajo con tornillo y carro de herramientas, estantería, garrafa y luminarias."""
    wood = textured_material("Tablero", ph.texture("plywood"))
    frame = textured_material("Bastidor", ph.texture("metal_plate"), base_color=(0.16, 0.26, 0.42), metallic=0.6)
    bx, by = -3.0, -4.0
    parts = [box_project(box("Tablero", (2.0, 0.8, 0.05), (bx, by, 0.88), wood, bevel=0.008), 1.0)]
    for dx in (-0.92, 0.92):
        for dy in (-0.33, 0.33):
            parts.append(box(f"Pata_{dx}_{dy}", (0.06, 0.06, 0.88), (bx + dx, by + dy, 0), frame, bevel=0.006))
    parts.append(box_project(box("Balda", (1.9, 0.7, 0.03), (bx, by, 0.18), frame, bevel=0.005), 1.0))
    parts.append(import_model(ph.model("bench_vice_01"), "Tornillo", (bx - 0.7, by + 0.2, 0.93), rotation_z=math.pi, max_texture=512))
    parts.append(import_model(ph.model("metal_toolbox"), "CajaHerramientas", (bx + 0.5, by - 0.05, 0.93), rotation_z=0.2, max_texture=512))
    parts.append(import_model(ph.model("metal_tool_chest"), "Cajonera", (bx + 1.7, by + 0.1, 0), rotation_z=math.pi))
    parts.append(import_model(ph.model("Shelf_01"), "Estanteria", (3.5, 7.7, 0)))
    parts.append(import_model(ph.model("industrial_storage_cart"), "Carro", (-4.5, 6.3, 0), rotation_z=math.pi / 2, max_texture=512))
    parts.append(import_model(ph.model("metal_jerrycan"), "Garrafa", (2.9, 7.5, 0.4), max_texture=512))
    for x in (-4.0, 0.0, 4.0):
        for y in (-3.5, 3.5):
            parts.append(import_model(ph.model("mounted_fluorescent_lights"), f"Luminaria_{x}_{y}", (x, y, HEIGHT - 0.06), rotation_z=math.pi / 2, max_texture=512))
    return parts


def workshop() -> str:
    """Compone el taller y devuelve el nombre del archivo."""
    parts = building() + floor_markings() + overhead_crane() + furniture()
    attach(hazard_root("carga-suspendida"), suspended_load())
    panel, cable = electrical_panel()
    attach(hazard_root("cable-pelado"), cable)
    drum, spill = oil_spill()
    attach(hazard_root("derrame-aceite"), spill)
    boxes, extinguisher = blocked_extinguisher()
    attach(hazard_root("extintor-bloqueado"), extinguisher)
    parent_all("Taller", parts + panel + drum + boxes)
    return "workshop.glb"
