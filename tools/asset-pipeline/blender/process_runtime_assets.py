import os
import sys
from pathlib import Path

import bpy


ARGS = sys.argv[sys.argv.index("--") + 1:]
MODE = ARGS[0]
OUTPUT = Path(ARGS[1]).resolve()
LOD_RATIO = float(ARGS[2]) if len(ARGS) > 2 else 1.0
ROOT = Path(os.environ["RA4_ASSET_ROOT"]).resolve()


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def import_glb(relative_path):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / relative_path))
    return [obj for obj in bpy.context.scene.objects if obj not in before]


def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.parent = parent
    return obj


def preserve_parent(obj, parent):
    matrix = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = matrix


def decimate(ratio):
    if ratio >= .999:
        return
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or len(obj.data.polygons) < 80 or obj.find_armature():
            continue
        modifier = obj.modifiers.new(name="RA4_LOD", type="DECIMATE")
        modifier.ratio = max(.12, ratio)
        modifier.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = obj
        try:
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        except RuntimeError:
            obj.modifiers.remove(modifier)


def normalize_meshes():
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        obj.data.validate(clean_customdata=False)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def add_collision(root, dimensions):
    bpy.ops.mesh.primitive_cube_add(size=1)
    collision = bpy.context.object
    collision.name = "CollisionRoot"
    collision.dimensions = dimensions
    collision.location.z = dimensions[2] / 2
    collision.display_type = "WIRE"
    collision.hide_render = True
    collision.parent = root


def prepare_tank():
    root = empty("VehicleRoot")
    for obj in list(bpy.context.scene.objects):
        if obj is root or obj.parent is not None:
            continue
        preserve_parent(obj, root)
    turret = empty("TurretYaw", (0, 0, 1.15), root)
    gun_pitch = empty("GunPitch", (0, 0, .25), turret)
    gun = bpy.data.objects.get("Tank_Gun")
    if gun:
        preserve_parent(gun, gun_pitch)
    empty("Muzzle", (0, 2.7, .05), gun_pitch)
    empty("SelectionAnchor", parent=root)
    empty("HealthBarAnchor", (0, 0, 2.35), root)
    empty("GroundShadowAnchor", parent=root)
    add_collision(root, (3.4, 4.6, 1.5))


def prepare_harvester():
    prepare_tank()
    root = bpy.data.objects["VehicleRoot"]
    imported = import_glb("assets-source/extracted/kenney-factory/Models/GLB format/hopper-high-square.glb")
    for obj in imported:
        if obj.parent is None:
            preserve_parent(obj, root)
            obj.name = "HarvesterContainer"
            obj.scale = (1.5, 2.2, 1.35)
            obj.location = (0, -.55, 1.25)
    empty("OreFillAnchor", (0, -.5, 2.2), root)
    empty("UnloadSocket", (0, -2.5, 1.0), root)


def prepare_infantry():
    keep_prefixes = ("Swat_",)
    keep_names = {"CharacterArmature", "Pistol"}
    for obj in list(bpy.context.scene.objects):
        if obj.name not in keep_names and not obj.name.startswith(keep_prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)
    root = empty("CharacterRoot")
    armature = bpy.data.objects.get("CharacterArmature")
    if armature:
        armature.name = "Armature"
        preserve_parent(armature, root)
    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH" and obj.parent is None:
            preserve_parent(obj, root)
    weapon = bpy.data.objects.get("Pistol")
    if weapon:
        weapon.name = "Weapon"
    empty("Muzzle", (0, -.45, 1.25), weapon or root)
    empty("SelectionAnchor", parent=root)
    empty("HealthBarAnchor", (0, 0, 2.05), root)
    add_collision(root, (.75, .75, 1.85))


def prepare_factory():
    reset_scene()
    root = empty("BuildingRoot")
    pieces = [
        ("assets-source/extracted/kenney-industrial/Models/GLB format/building-a.glb", (0, 0, 0), (2.7, 2.7, 2.2), "FactoryHall"),
        ("assets-source/extracted/kenney-factory/Models/GLB format/door-wide-open.glb", (0, -3.7, .1), (2.4, 1.7, 2.4), "VehicleBay"),
        ("assets-source/extracted/kenney-factory/Models/GLB format/machine-fortified.glb", (2.7, 0, .2), (1.4, 1.4, 1.4), "ProductionBlock"),
        ("assets-source/extracted/kenney-industrial/Models/GLB format/chimney-large.glb", (-2.5, 1.8, 0), (1.6, 1.6, 2.4), "ExhaustStack"),
        ("assets-source/extracted/kenney-factory/Models/GLB format/pipe-large-long.glb", (2.8, 1.6, .5), (1.5, 1.5, 2.0), "ProcessPipe"),
    ]
    for source, location, scale, name in pieces:
        imported = import_glb(source)
        piece_root = empty(name, location, root)
        piece_root.scale = scale
        for obj in imported:
            if obj.parent is None:
                preserve_parent(obj, piece_root)
    empty("UnitExit", (0, -5.4, 0), root)
    empty("SelectionAnchor", parent=root)
    empty("HealthBarAnchor", (0, 0, 6.0), root)
    add_collision(root, (9.5, 10.5, 4.5))


def prepare_pillbox():
    reset_scene()
    root = empty("BuildingRoot")
    for source, location, scale, name in [
        ("assets-source/extracted/kenney-factory/Models/GLB format/machine-fortified.glb", (0, 0, 0), (1.7, 1.7, .8), "ConcreteBunker"),
        ("assets-source/extracted/kenney-factory/Models/GLB format/scanner-low.glb", (0, 0, 1.0), (.8, .8, .8), "TurretYaw"),
    ]:
        imported = import_glb(source)
        piece_root = empty(name, location, root)
        piece_root.scale = scale
        for obj in imported:
            if obj.parent is None:
                preserve_parent(obj, piece_root)
    turret = bpy.data.objects.get("TurretYaw")
    empty("GunPitch", (0, -.25, .2), turret)
    empty("Muzzle", (0, -.9, .2), turret)
    empty("SelectionAnchor", parent=root)
    empty("HealthBarAnchor", (0, 0, 2.1), root)
    add_collision(root, (3.2, 3.2, 1.6))


def prepare_static(source, root_name, scale=1.0):
    reset_scene()
    root = empty(root_name)
    imported = import_glb(source)
    for obj in imported:
        if obj.parent is None:
            preserve_parent(obj, root)
    root.scale = (scale, scale, scale)


if MODE == "tank":
    prepare_tank()
elif MODE == "harvester":
    prepare_harvester()
elif MODE == "infantry":
    prepare_infantry()
elif MODE == "factory":
    prepare_factory()
elif MODE == "pillbox":
    prepare_pillbox()
elif MODE == "tree":
    prepare_static("assets-source/extracted/kenney-mini-forest/Models/GLB format/tree-high.glb", "PropRoot", 1.2)
elif MODE == "rocks":
    prepare_static("assets-source/extracted/kenney-mini-forest/Models/GLB format/rocks-high.glb", "PropRoot", 1.3)
elif MODE == "barrier":
    prepare_static("assets-source/extracted/kenney-factory/Models/GLB format/structure-short.glb", "PropRoot", .65)
elif MODE == "crate":
    prepare_static("assets-source/extracted/kenney-factory/Models/GLB format/box-large.glb", "PropRoot", .8)
else:
    raise RuntimeError(f"Unknown asset mode: {MODE}")

normalize_meshes()
decimate(LOD_RATIO)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT),
    export_format="GLB",
    export_apply=True,
    export_animations=True,
    export_skins=True,
    export_cameras=False,
    export_lights=False,
)
print(f"RA4_ASSET_BUILT mode={MODE} lod={LOD_RATIO} output={OUTPUT}")
