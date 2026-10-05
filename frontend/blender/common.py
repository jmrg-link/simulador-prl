"""Utilidades compartidas por los scripts que modelan los assets del simulador en Blender.

Cada asset se construye en una escena vacía con medidas reales en metros, con el eje +Y de Blender
como frente (el exportador glTF lo convierte en -Z de three.js, hacia donde mira la cámara)
y se exporta como .glb. Corre con el Python que trae Blender (3.13), no con el del sistema.
Las piezas que deben iluminarse al mirar un riesgo se nombran con el prefijo HL_.
"""

import math
from pathlib import Path

import bmesh
import bpy

HIGHLIGHT_PREFIX = "HL_"


def reset_scene() -> None:
    """Vacía la escena y los bloques de datos huérfanos para empezar cada asset desde cero."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    reset_imports()
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.curves):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def material(name: str, color: tuple[float, float, float], roughness: float = 0.6, metallic: float = 0.0,
             emission: tuple[float, float, float] | None = None, emission_strength: float = 0.0) -> bpy.types.Material:
    """Devuelve el material PBR `name`, creándolo si no existe. El color va en sRGB 0-1."""
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    mat = bpy.data.materials.new(name)
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*srgb_to_linear(color), 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*srgb_to_linear(emission), 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def srgb_to_linear(color: tuple[float, float, float]) -> tuple[float, float, float]:
    """Convierte un color sRGB a lineal, que es lo que espera el nodo Principled BSDF."""
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in color)


def assign(obj: bpy.types.Object, mat: bpy.types.Material) -> bpy.types.Object:
    """Asigna `mat` como único material de `obj` y lo devuelve."""
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def finish(obj: bpy.types.Object, name: str, bevel: float = 0.0, segments: int = 2,
           subdivide: int = 0, smooth: bool = False) -> bpy.types.Object:
    """Nombra el objeto, le añade bisel y subdivisión opcionales y aplica sombreado suave si se pide."""
    obj.name = name
    obj.data.name = name
    if bevel > 0:
        modifier = obj.modifiers.new("Bevel", "BEVEL")
        modifier.width = bevel
        modifier.segments = segments
        modifier.limit_method = "ANGLE"
    if subdivide > 0:
        modifier = obj.modifiers.new("Subdivision", "SUBSURF")
        modifier.levels = subdivide
        modifier.render_levels = subdivide
    if smooth or subdivide > 0:
        set_smooth(obj)
    return obj


def set_smooth(obj: bpy.types.Object) -> None:
    """Sombreado suave en todas las caras del objeto."""
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def box(name: str, size: tuple[float, float, float], location: tuple[float, float, float],
        mat: bpy.types.Material, bevel: float = 0.004, rotation: tuple[float, float, float] = (0, 0, 0)) -> bpy.types.Object:
    """Caja de `size` metros con su base centrada en `location`, biselada para captar la luz."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(location[0], location[1], location[2] + size[2] / 2), rotation=rotation)
    obj = bpy.context.active_object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(assign(obj, mat), name, bevel=bevel)


def cylinder(name: str, radius: float, depth: float, location: tuple[float, float, float],
             mat: bpy.types.Material, rotation: tuple[float, float, float] = (0, 0, 0), vertices: int = 32,
             bevel: float = 0.0) -> bpy.types.Object:
    """Cilindro centrado en `location`."""
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=location, rotation=rotation, vertices=vertices)
    obj = assign(bpy.context.active_object, mat)
    finish(obj, name, bevel=bevel)
    smooth_sides(obj)
    return obj


def smooth_sides(obj: bpy.types.Object) -> None:
    """Suaviza las caras laterales de un cilindro y deja planas las tapas."""
    for polygon in obj.data.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4


def sphere(name: str, radius: float, location: tuple[float, float, float], mat: bpy.types.Material,
           scale: tuple[float, float, float] = (1, 1, 1)) -> bpy.types.Object:
    """Esfera UV suavizada, escalable a elipsoide."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=location, segments=32, ring_count=16)
    obj = assign(bpy.context.active_object, mat)
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(obj, name, smooth=True)
    return obj


def lathe(name: str, profile: list[tuple[float, float]], mat: bpy.types.Material,
          location: tuple[float, float, float] = (0, 0, 0), steps: int = 40) -> bpy.types.Object:
    """Sólido de revolución alrededor del eje Z a partir de pares (radio, altura) de abajo arriba."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = [[bm.verts.new((r * math.cos(2 * math.pi * s / steps), r * math.sin(2 * math.pi * s / steps), z))
              for s in range(steps)] for r, z in profile]
    for lower, upper in zip(rings, rings[1:]):
        for s in range(steps):
            bm.faces.new((lower[s], lower[(s + 1) % steps], upper[(s + 1) % steps], upper[s]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    assign(obj, mat)
    smooth_sides(obj)
    return obj


def tube(name: str, points: list[tuple[float, float, float]], radius: float, mat: bpy.types.Material,
         resolution: int = 8) -> bpy.types.Object:
    """Tubo que sigue una polilínea suavizada, convertido a malla. Sirve para cables, mangueras y asas."""
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    curve.resolution_u = resolution
    curve.use_fill_caps = True
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bezier, point in zip(spline.bezier_points, points):
        bezier.co = point
        bezier.handle_left_type = bezier.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(mat)
    return to_mesh(obj)


def to_mesh(obj: bpy.types.Object) -> bpy.types.Object:
    """Convierte una curva u objeto con modificadores en malla con sombreado suave."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    converted = bpy.context.active_object
    set_smooth(converted)
    return converted


def parent_all(name: str, objects: list[bpy.types.Object]) -> bpy.types.Object:
    """Agrupa los objetos bajo un vacío con `name`, que será el nodo raíz del asset."""
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    for obj in objects:
        obj.parent = root
    return root


def export_glb(path: Path) -> None:
    """Exporta la escena completa como .glb, aplicando modificadores y con +Y arriba para three.js.
    Las texturas salen en WebP (el exportador reempaqueta metal y rugosidad en un mapa nuevo, que en
    PNG multiplicaba el peso) y la geometría con EXT_meshopt_compression, que el frontal decodifica
    con MeshoptDecoder."""
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_image_format="WEBP",
        export_image_quality=80,
        export_meshopt_compression_enable=True,
        export_extras=False,
        export_lights=False,
        use_selection=False,
    )


def textured_material(name: str, maps: dict, base_color: tuple[float, float, float] | None = None,
                      metallic: float = 0.0, normal_strength: float = 1.0) -> bpy.types.Material:
    """Material PBR con mapas de imagen (difuso, rugosidad, normal). Con `base_color` se usa ese color
    plano y de la textura solo el relieve y la rugosidad, para materiales pintados."""
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    mat = bpy.data.materials.new(name)
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Metallic"].default_value = metallic
    if base_color:
        bsdf.inputs["Base Color"].default_value = (*srgb_to_linear(base_color), 1.0)
    else:
        links.new(_image_node(nodes, maps["diffuse"], "sRGB").outputs["Color"], bsdf.inputs["Base Color"])
    links.new(_image_node(nodes, maps["roughness"], "Non-Color").outputs["Color"], bsdf.inputs["Roughness"])
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = normal_strength
    links.new(_image_node(nodes, maps["normal"], "Non-Color").outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def _image_node(nodes: bpy.types.Nodes, path: Path, colorspace: str) -> bpy.types.ShaderNodeTexImage:
    """Nodo de imagen con el espacio de color indicado."""
    node = nodes.new("ShaderNodeTexImage")
    node.image = bpy.data.images.load(str(path), check_existing=True)
    node.image.colorspace_settings.name = colorspace
    return node


def box_project(obj: bpy.types.Object, tile: float) -> bpy.types.Object:
    """Proyección UV en cubo con una repetición de textura cada `tile` metros."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=tile, scale_to_bounds=False, correct_aspect=True)
    bpy.ops.object.mode_set(mode="OBJECT")
    return obj


_IMPORTED: dict[str, list[bpy.types.Object]] = {}


def import_model(path: Path, name: str, location: tuple[float, float, float], rotation_z: float = 0.0,
                 scale: float = 1.0, max_texture: int = 1024) -> bpy.types.Object:
    """Importa un glTF y cuelga sus objetos raíz de un vacío `name` colocado en `location`.

    Si el mismo archivo ya se importó, crea copias que comparten malla y materiales, para que el
    exportador escriba la geometría una sola vez. Las texturas mayores que `max_texture` se reducen.
    """
    imported = _instance_or_import(path, max_texture)
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    for obj in imported:
        if obj.parent is None:
            obj.parent = root
    root.location = location
    root.rotation_euler = (0, 0, rotation_z)
    root.scale = (scale, scale, scale)
    return root


def _instance_or_import(path: Path, max_texture: int) -> list[bpy.types.Object]:
    """Objetos nuevos de un glTF: copias enlazadas si ya se importó, importación real si no."""
    key = str(path)
    if key in _IMPORTED:
        return _linked_copies(_IMPORTED[key])
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=key)
    imported = [obj for obj in bpy.data.objects if obj not in before]
    _IMPORTED[key] = imported
    _limit_textures(imported, max_texture)
    return imported


def _linked_copies(originals: list[bpy.types.Object]) -> list[bpy.types.Object]:
    """Copia una jerarquía importada compartiendo los datos de malla y conservando el parentesco."""
    mapping = {}
    for obj in originals:
        copy = obj.copy()
        bpy.context.collection.objects.link(copy)
        mapping[obj] = copy
    for original, copy in mapping.items():
        copy.parent = mapping.get(original.parent)
        if copy.parent is not None:
            copy.matrix_parent_inverse = original.matrix_parent_inverse.copy()
    return list(mapping.values())


def _limit_textures(objects: list[bpy.types.Object], max_size: int) -> None:
    """Reduce a `max_size` las imágenes de los materiales de `objects` que lo superen."""
    for obj in objects:
        for slot in getattr(obj, "material_slots", []):
            if slot.material is None or slot.material.node_tree is None:
                continue
            for node in slot.material.node_tree.nodes:
                image = getattr(node, "image", None)
                if image is not None and max(image.size) > max_size:
                    image.scale(max_size, max_size)


def reset_imports() -> None:
    """Olvida los glTF importados; se llama al vaciar la escena entre assets."""
    _IMPORTED.clear()


def rename_tree(root: bpy.types.Object, prefix: str) -> None:
    """Antepone `prefix` al nombre de todas las mallas que cuelgan de `root`."""
    for obj in root.children_recursive:
        if obj.type == "MESH" and not obj.name.startswith(prefix):
            obj.name = prefix + obj.name


def puddle(name: str, radius: float, mat: bpy.types.Material, center: tuple[float, float, float],
           points: int = 64) -> bpy.types.Object:
    """Mancha plana de borde irregular con lóbulos, como un derrame que se ha extendido por el suelo."""
    phases = (0.7, 2.3, 4.1)
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    middle = bm.verts.new((0, 0, 0))
    ring = []
    for i in range(points):
        a = math.tau * i / points
        r = radius * (1 + 0.2 * math.sin(3 * a + phases[0]) + 0.1 * math.sin(5 * a + phases[1]) + 0.05 * math.sin(11 * a + phases[2]))
        ring.append(bm.verts.new((1.3 * r * math.cos(a), r * math.sin(a), 0)))
    for i in range(points):
        bm.faces.new((middle, ring[i], ring[(i + 1) % points]))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = center
    obj.data.materials.append(mat)
    set_smooth(obj)
    return obj
