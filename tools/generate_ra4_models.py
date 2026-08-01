import os
import sys
import math

try:
    import bpy
    import mathutils
except ImportError:
    print("This script must be run inside Blender: blender --background --python tools/generate_ra4_models.py")
    sys.exit(1)

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
UNITS_DIR = os.path.join(PROJECT_ROOT, 'apps/web-client/public/assets/models/units')
BUILDINGS_DIR = os.path.join(PROJECT_ROOT, 'apps/web-client/public/assets/models/buildings')
FBX_DIR = os.path.join(PROJECT_ROOT, 'apps/web-client/public/assets/models/fbx')

os.makedirs(UNITS_DIR, exist_ok=True)
os.makedirs(BUILDINGS_DIR, exist_ok=True)
os.makedirs(FBX_DIR, exist_ok=True)

# Keep only environment props and static map decorations in PRESERVE_MODELS
PRESERVE_MODELS = {
    'ENV_PineTree01',
    'ENV_CoastRocks01',
    'PROP_ConcreteBarrier',
    'PROP_MilitaryCrate',
}

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        if mat.users == 0:
            bpy.data.materials.remove(mat)

def create_pbr_material(name, color_rgba, metallic=0.9, roughness=0.2, emissive_rgba=None, emissive_strength=12.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color_rgba
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
        if emissive_rgba and 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = emissive_rgba
            bsdf.inputs['Emission Strength'].default_value = emissive_strength
    return mat

def get_materials_for_model(model_id):
    mat_dark_obsidian = create_pbr_material("Mat_DarkObsidian", (0.04, 0.04, 0.06, 1.0), metallic=0.95, roughness=0.15)
    mat_dark_steel = create_pbr_material("Mat_DarkSteel", (0.12, 0.13, 0.16, 1.0), metallic=0.9, roughness=0.25)
    mat_gold_trim = create_pbr_material("Mat_GoldTrim", (0.85, 0.65, 0.15, 1.0), metallic=0.98, roughness=0.15)
    mat_treads = create_pbr_material("Mat_Treads", (0.05, 0.05, 0.06, 1.0), metallic=0.6, roughness=0.6)
    mat_glass = create_pbr_material("Mat_Glass", (0.1, 0.4, 0.6, 0.6), metallic=0.1, roughness=0.1)
    mat_rubber = create_pbr_material("Mat_Rubber", (0.02, 0.02, 0.02, 1.0), metallic=0.1, roughness=0.8)

    mat_soviet_armor = create_pbr_material("Mat_SovietArmor", (0.35, 0.08, 0.06, 1.0), metallic=0.7, roughness=0.35)
    mat_soviet_red = create_pbr_material("Mat_SovietRed", (1.0, 0.05, 0.05, 1.0), metallic=0.3, roughness=0.2, emissive_rgba=(1.0, 0.1, 0.1, 1.0), emissive_strength=10.0)

    mat_alliance_armor = create_pbr_material("Mat_AllianceArmor", (0.08, 0.22, 0.45, 1.0), metallic=0.85, roughness=0.2)
    mat_alliance_blue = create_pbr_material("Mat_AllianceBlue", (0.05, 0.65, 1.0, 1.0), metallic=0.4, roughness=0.15, emissive_rgba=(0.1, 0.75, 1.0, 1.0), emissive_strength=10.0)

    mat_coalition_gold = create_pbr_material("Mat_CoalitionGold", (0.8, 0.58, 0.1, 1.0), metallic=0.95, roughness=0.2)
    mat_coalition_teal = create_pbr_material("Mat_CoalitionTeal", (0.05, 0.85, 0.75, 1.0), metallic=0.5, roughness=0.15, emissive_rgba=(0.1, 0.95, 0.85, 1.0), emissive_strength=10.0)

    mat_chrono_hull = create_pbr_material("Mat_ChronoHull", (0.07, 0.05, 0.12, 1.0), metallic=0.92, roughness=0.18)
    mat_chrono_purple = create_pbr_material("Mat_ChronoPurple", (0.7, 0.15, 1.0, 1.0), metallic=0.3, roughness=0.1, emissive_rgba=(0.85, 0.25, 1.0, 1.0), emissive_strength=12.0)
    mat_chrono_core = create_pbr_material("Mat_ChronoCore", (0.9, 0.4, 1.0, 1.0), metallic=0.1, roughness=0.05, emissive_rgba=(0.95, 0.5, 1.0, 1.0), emissive_strength=15.0)

    if 'CH_' in model_id:
        return {'primary': mat_chrono_hull, 'accent': mat_chrono_purple, 'core': mat_chrono_core, 'dark_steel': mat_dark_obsidian, 'treads': mat_treads, 'glass': mat_glass, 'gold': mat_gold_trim, 'rubber': mat_rubber}
    elif 'SU_' in model_id:
        return {'primary': mat_soviet_armor, 'accent': mat_soviet_red, 'core': mat_soviet_red, 'dark_steel': mat_dark_steel, 'treads': mat_treads, 'glass': mat_glass, 'gold': mat_gold_trim, 'rubber': mat_rubber}
    elif 'AL_' in model_id:
        return {'primary': mat_alliance_armor, 'accent': mat_alliance_blue, 'core': mat_alliance_blue, 'dark_steel': mat_dark_steel, 'treads': mat_treads, 'glass': mat_glass, 'gold': mat_gold_trim, 'rubber': mat_rubber}
    else:
        return {'primary': mat_coalition_gold, 'accent': mat_coalition_teal, 'core': mat_coalition_teal, 'dark_steel': mat_dark_steel, 'treads': mat_treads, 'glass': mat_glass, 'gold': mat_gold_trim, 'rubber': mat_rubber}

def add_sockets(root_name="VehicleRoot", turret=True, muzzle=True, is_building=False):
    root = bpy.data.objects.new(root_name, None)
    bpy.context.scene.collection.objects.link(root)

    sel_anchor = bpy.data.objects.new("SelectionAnchor", None)
    sel_anchor.parent = root
    sel_anchor.location = (0, 0, 0)
    bpy.context.scene.collection.objects.link(sel_anchor)

    hp_anchor = bpy.data.objects.new("HealthBarAnchor", None)
    hp_anchor.parent = root
    hp_anchor.location = (0, 0, 3.2 if is_building else 2.2)
    bpy.context.scene.collection.objects.link(hp_anchor)

    col_root = bpy.data.objects.new("CollisionRoot", None)
    col_root.parent = root
    bpy.context.scene.collection.objects.link(col_root)

    turret_yaw = None
    gun_pitch = None
    muzzle_node = None

    if turret:
        turret_yaw = bpy.data.objects.new("TurretYaw", None)
        turret_yaw.parent = root
        turret_yaw.location = (0, 0, 1.1)
        bpy.context.scene.collection.objects.link(turret_yaw)

        gun_pitch = bpy.data.objects.new("GunPitch", None)
        gun_pitch.parent = turret_yaw
        gun_pitch.location = (0, 0.4, 0.25)
        bpy.context.scene.collection.objects.link(gun_pitch)

        if muzzle:
            muzzle_node = bpy.data.objects.new("Muzzle", None)
            muzzle_node.parent = gun_pitch
            muzzle_node.location = (0, 2.0, 0)
            bpy.context.scene.collection.objects.link(muzzle_node)

    return root, turret_yaw, gun_pitch, muzzle_node, col_root

def add_collision_box(col_root, dimensions, location=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    cbox = bpy.context.active_object
    cbox.name = "CollisionBox"
    cbox.scale = dimensions
    cbox.parent = col_root
    cbox.display_type = 'WIRE'

# --- INFANTRY BUILDER ---

def build_infantry(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle, col_root = add_sockets("VehicleRoot", turret=False, muzzle=True)
    add_collision_box(col_root, (0.8, 0.8, 1.8), (0, 0, 0.9))

    # Boots
    for side in [-0.22, 0.22]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side, 0.05, 0.15))
        boot = bpy.context.active_object
        boot.scale = (0.16, 0.32, 0.3)
        boot.parent = root
        boot.data.materials.append(mats['dark_steel'])

    # Legs & Kneepads
    for side in [-0.22, 0.22]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.7, location=(side, 0, 0.6))
        leg = bpy.context.active_object
        leg.parent = root
        leg.data.materials.append(mats['primary'])

        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side, 0.1, 0.6))
        knee = bpy.context.active_object
        knee.scale = (0.14, 0.08, 0.14)
        knee.parent = leg
        knee.data.materials.append(mats['dark_steel'])

    # Torso & Tactical Vest
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.15))
    torso = bpy.context.active_object
    torso.scale = (0.55, 0.35, 0.6)
    torso.parent = root
    torso.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.02, 1.18))
    vest = bpy.context.active_object
    vest.scale = (0.58, 0.38, 0.45)
    vest.parent = torso
    vest.data.materials.append(mats['dark_steel'])

    # Arms
    for side in [-0.35, 0.35]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.55, location=(side, 0.1, 1.15))
        arm = bpy.context.active_object
        arm.rotation_euler = (math.pi/4, 0, 0)
        arm.parent = torso
        arm.data.materials.append(mats['primary'])

    # Head & Helmet
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18, location=(0, 0, 1.58))
    head = bpy.context.active_object
    head.parent = torso
    head.data.materials.append(mats['dark_steel'])

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2, location=(0, -0.02, 1.62))
    helmet = bpy.context.active_object
    helmet.scale = (1.05, 1.05, 0.9)
    helmet.parent = head
    helmet.data.materials.append(mats['primary'])

    # Glowing Visor
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.16, 1.6))
    visor = bpy.context.active_object
    visor.scale = (0.26, 0.06, 0.08)
    visor.parent = helmet
    visor.data.materials.append(mats['accent'])

    # Weapon (Assault Rifle / Rocket Launcher)
    is_rocket = 'Zaslon' in model_id or 'Lancer' in model_id or 'Grenadier' in model_id or 'Pzk' in model_id
    if is_rocket:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.14, depth=1.4, location=(0.28, 0.2, 1.25))
        weapon = bpy.context.active_object
        weapon.rotation_euler = (math.pi/2 - 0.2, 0, 0)
        weapon.parent = torso
        weapon.data.materials.append(mats['dark_steel'])
    else:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.15, 0.3, 1.1))
        weapon = bpy.context.active_object
        weapon.scale = (0.1, 0.7, 0.16)
        weapon.parent = torso
        weapon.data.materials.append(mats['dark_steel'])

        bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.6, location=(0.15, 0.65, 1.12))
        barrel = bpy.context.active_object
        barrel.rotation_euler = (math.pi/2, 0, 0)
        barrel.parent = weapon
        barrel.data.materials.append(mats['accent'])


# --- TANK & MBT BUILDER ---

def build_heavy_tank(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle, col_root = add_sockets("VehicleRoot", turret=True, muzzle=True)
    add_collision_box(col_root, (2.6, 4.6, 1.8), (0, 0, 0.9))

    # Angled Lower Hull
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.65))
    hull = bpy.context.active_object
    hull.scale = (2.2, 4.0, 0.65)
    hull.parent = root
    hull.data.materials.append(mats['primary'])

    # Front Sloped Armor Glacis Plate
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 1.8, 0.75))
    glacis = bpy.context.active_object
    glacis.scale = (2.1, 0.8, 0.4)
    glacis.rotation_euler = (math.pi/6, 0, 0)
    glacis.parent = hull
    glacis.data.materials.append(mats['primary'])

    # Treads & Road Wheels
    for side in [-1.3, 1.3]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side, 0, 0.55))
        tread_housing = bpy.context.active_object
        tread_housing.scale = (0.65, 4.4, 0.75)
        tread_housing.parent = root
        tread_housing.data.materials.append(mats['treads'])

        # Side Armor Skirt
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 1.05, 0, 0.65))
        skirt = bpy.context.active_object
        skirt.scale = (0.1, 4.2, 0.5)
        skirt.parent = tread_housing
        skirt.data.materials.append(mats['primary'])

        # Wheels
        for y_pos in [-1.6, -0.8, 0.0, 0.8, 1.6]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.28, depth=0.55, location=(side, y_pos, 0.45))
            wheel = bpy.context.active_object
            wheel.rotation_euler = (0, math.pi/2, 0)
            wheel.parent = tread_housing
            wheel.data.materials.append(mats['dark_steel'])

    # Turret
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.15, 1.25))
    turret = bpy.context.active_object
    turret.scale = (1.8, 2.2, 0.65)
    turret.parent = turret_yaw if turret_yaw else root
    turret.data.materials.append(mats['primary'])

    # Turret Commander Hatch & Sensor Dome
    bpy.ops.mesh.primitive_cylinder_add(radius=0.35, depth=0.2, location=(0.4, -0.4, 1.65))
    hatch = bpy.context.active_object
    hatch.parent = turret
    hatch.data.materials.append(mats['dark_steel'])

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.18, location=(-0.4, -0.4, 1.68))
    sensor = bpy.context.active_object
    sensor.parent = turret
    sensor.data.materials.append(mats['accent'])

    # Dual or Single Gun Barrels
    is_dual = 'Voevoda' in model_id or 'Granit' in model_id or 'Qinglong' in model_id or 'Timeline' in model_id
    offsets = [-0.3, 0.3] if is_dual else [0.0]

    for offset in offsets:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=2.4, location=(offset, 1.4, 1.3))
        barrel = bpy.context.active_object
        barrel.rotation_euler = (math.pi/2, 0, 0)
        barrel.parent = gun_pitch if gun_pitch else turret
        barrel.data.materials.append(mats['dark_steel'])

        # Muzzle Brake
        bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.35, location=(offset, 2.5, 1.3))
        muzzle_brake = bpy.context.active_object
        muzzle_brake.rotation_euler = (math.pi/2, 0, 0)
        muzzle_brake.parent = barrel
        muzzle_brake.data.materials.append(mats['accent'])


# --- HARVESTER / ORE CARRIER BUILDER ---

def build_harvester(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle, col_root = add_sockets("VehicleRoot", turret=False, muzzle=False)
    add_collision_box(col_root, (2.8, 5.0, 2.2), (0, 0, 1.1))

    # Heavy Chassis
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.7))
    chassis = bpy.context.active_object
    chassis.scale = (2.6, 4.6, 0.7)
    chassis.parent = root
    chassis.data.materials.append(mats['dark_steel'])

    # Large Heavy Wheels
    for side in [-1.4, 1.4]:
        for y_pos in [-1.6, 0.0, 1.6]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.55, depth=0.6, location=(side, y_pos, 0.55))
            wheel = bpy.context.active_object
            wheel.rotation_euler = (0, math.pi/2, 0)
            wheel.parent = chassis
            wheel.data.materials.append(mats['rubber'])

    # Driver Cabin
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 1.6, 1.45))
    cabin = bpy.context.active_object
    cabin.scale = (2.2, 1.2, 0.8)
    cabin.parent = chassis
    cabin.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 2.15, 1.5))
    windshield = bpy.context.active_object
    windshield.scale = (1.9, 0.1, 0.55)
    windshield.parent = cabin
    windshield.data.materials.append(mats['glass'])

    # Rear Ore Hopper Container
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.8, 1.55))
    container = bpy.context.active_object
    container.scale = (2.4, 2.6, 1.0)
    container.parent = chassis
    container.data.materials.append(mats['primary'])

    # Ore Fill Socket Anchor
    fill_anchor = bpy.data.objects.new("OreFillAnchor", None)
    fill_anchor.parent = container
    fill_anchor.location = (0, 0, 0.5)
    bpy.context.scene.collection.objects.link(fill_anchor)

    # Front Drill / Collector Auger
    bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=2.2, location=(0, 2.5, 0.6))
    drill = bpy.context.active_object
    drill.rotation_euler = (0, math.pi/2, 0)
    drill.parent = chassis
    drill.data.materials.append(mats['gold'])


# --- SCOUT / LIGHT VEHICLE BUILDER ---

def build_scout_vehicle(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle, col_root = add_sockets("VehicleRoot", turret=True, muzzle=True)
    add_collision_box(col_root, (2.0, 3.8, 1.5), (0, 0, 0.75))

    # Sleek Chassis
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.55))
    chassis = bpy.context.active_object
    chassis.scale = (1.7, 3.4, 0.5)
    chassis.parent = root
    chassis.data.materials.append(mats['primary'])

    # Wheels
    for side in [-1.0, 1.0]:
        for y_pos in [-1.2, 1.2]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.4, depth=0.4, location=(side, y_pos, 0.4))
            wheel = bpy.context.active_object
            wheel.rotation_euler = (0, math.pi/2, 0)
            wheel.parent = chassis
            wheel.data.materials.append(mats['rubber'])

    # Cabin & Roll Cage
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.2, 1.0))
    cabin = bpy.context.active_object
    cabin.scale = (1.3, 1.6, 0.55)
    cabin.parent = chassis
    cabin.data.materials.append(mats['dark_steel'])

    # Turret Machine Gun
    bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=0.2, location=(0, -0.4, 1.35))
    turret_base = bpy.context.active_object
    turret_base.parent = turret_yaw if turret_yaw else cabin
    turret_base.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=1.2, location=(0, 0.2, 1.35))
    mg_barrel = bpy.context.active_object
    mg_barrel.rotation_euler = (math.pi/2, 0, 0)
    mg_barrel.parent = gun_pitch if gun_pitch else turret_base
    mg_barrel.data.materials.append(mats['accent'])


# --- ARTILLERY & MLRS BUILDER ---

def build_artillery_vehicle(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle, col_root = add_sockets("VehicleRoot", turret=True, muzzle=True)
    add_collision_box(col_root, (2.4, 4.8, 2.0), (0, 0, 1.0))

    # Chassis
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.6))
    chassis = bpy.context.active_object
    chassis.scale = (2.1, 4.4, 0.6)
    chassis.parent = root
    chassis.data.materials.append(mats['dark_steel'])

    # Front Cabin
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 1.4, 1.3))
    cabin = bpy.context.active_object
    cabin.scale = (2.0, 1.2, 0.8)
    cabin.parent = chassis
    cabin.data.materials.append(mats['primary'])

    # Missile Launcher Pod / Howitzer
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.8, 1.6))
    pod = bpy.context.active_object
    pod.scale = (1.8, 2.0, 0.7)
    pod.rotation_euler = (-math.pi/10, 0, 0)
    pod.parent = gun_pitch if gun_pitch else chassis
    pod.data.materials.append(mats['primary'])

    # Rocket Tubes
    for x_off in [-0.5, 0.0, 0.5]:
        for z_off in [0.15, -0.15]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.4, location=(x_off, 0.9, z_off))
            tube = bpy.context.active_object
            tube.rotation_euler = (math.pi/2, 0, 0)
            tube.parent = pod
            tube.data.materials.append(mats['accent'])


# --- AIR / JET / HELICOPTER BUILDER ---

def build_aircraft(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle, col_root = add_sockets("VehicleRoot", turret=True, muzzle=True)
    add_collision_box(col_root, (3.2, 4.5, 1.5), (0, 0, 1.5))

    # Aerodynamic Fuselage
    bpy.ops.mesh.primitive_cylinder_add(radius=0.55, depth=4.2, location=(0, 0, 1.5))
    fuse = bpy.context.active_object
    fuse.rotation_euler = (math.pi/2, 0, 0)
    fuse.parent = root
    fuse.data.materials.append(mats['primary'])

    # Cockpit Canopy
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.45, location=(0, 0.8, 1.8))
    canopy = bpy.context.active_object
    canopy.scale = (0.8, 1.8, 0.7)
    canopy.parent = fuse
    canopy.data.materials.append(mats['glass'])

    # Wings
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.45))
    wings = bpy.context.active_object
    wings.scale = (3.6, 1.0, 0.08)
    wings.parent = fuse
    wings.data.materials.append(mats['primary'])

    # Engines / Thrusters with glowing emissions
    for side in [-1.2, 1.2]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=1.2, location=(side, -0.6, 1.45))
        engine = bpy.context.active_object
        engine.rotation_euler = (math.pi/2, 0, 0)
        engine.parent = wings
        engine.data.materials.append(mats['dark_steel'])

        bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=0.1, location=(side, -1.22, 1.45))
        flame = bpy.context.active_object
        flame.rotation_euler = (math.pi/2, 0, 0)
        flame.parent = engine
        flame.data.materials.append(mats['accent'])


# --- NAVAL SHIP & SUBMARINE BUILDER ---

def build_naval(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle, col_root = add_sockets("VehicleRoot", turret=True, muzzle=True)
    add_collision_box(col_root, (2.2, 6.5, 1.8), (0, 0, 0.9))

    is_sub = 'Submarine' in model_id or 'Morok' in model_id or 'Bathys' in model_id

    if is_sub:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.85, depth=6.2, location=(0, 0, 0.7))
        hull = bpy.context.active_object
        hull.rotation_euler = (math.pi/2, 0, 0)
        hull.parent = root
        hull.data.materials.append(mats['dark_steel'])

        # Conning Tower
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.5, 1.6))
        tower = bpy.context.active_object
        tower.scale = (0.6, 1.4, 0.7)
        tower.parent = hull
        tower.data.materials.append(mats['primary'])
    else:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.5))
        hull = bpy.context.active_object
        hull.scale = (2.2, 6.2, 0.7)
        hull.parent = root
        hull.data.materials.append(mats['primary'])

        # Deck Superstructure
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.2, 1.2))
        superstruct = bpy.context.active_object
        superstruct.scale = (1.6, 2.4, 0.8)
        superstruct.parent = hull
        superstruct.data.materials.append(mats['dark_steel'])

        # Turrets
        for y_pos in [-2.0, 1.8]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=0.3, location=(0, y_pos, 0.95))
            turret = bpy.context.active_object
            turret.parent = hull
            turret.data.materials.append(mats['primary'])


# --- MECHA & WALKER BUILDER ---

def build_walker_mecha(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle, col_root = add_sockets("VehicleRoot", turret=True, muzzle=True)
    add_collision_box(col_root, (2.6, 2.6, 3.2), (0, 0, 1.6))

    # Legs & Feet
    for side in [-1.1, 1.1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side, 0, 0.2))
        foot = bpy.context.active_object
        foot.scale = (0.7, 1.0, 0.3)
        foot.parent = root
        foot.data.materials.append(mats['dark_steel'])

        bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=1.6, location=(side, 0, 1.0))
        leg = bpy.context.active_object
        leg.parent = foot
        leg.data.materials.append(mats['primary'])

    # Central Torso Core
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 2.1))
    torso = bpy.context.active_object
    torso.scale = (1.8, 1.6, 1.1)
    torso.parent = root
    torso.data.materials.append(mats['primary'])

    # Arm Guns
    for side in [-1.3, 1.3]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=1.8, location=(side, 0.6, 2.0))
        cannon = bpy.context.active_object
        cannon.rotation_euler = (math.pi/2, 0, 0)
        cannon.parent = torso
        cannon.data.materials.append(mats['dark_steel'])


def export_model_files(model_name, category='unit'):
    bpy.ops.object.select_all(action='SELECT')

    fbx_path_1 = os.path.join(FBX_DIR, f"{model_name}.fbx")
    out_dir = UNITS_DIR if category == 'unit' else BUILDINGS_DIR
    fbx_path_2 = os.path.join(out_dir, f"{model_name}.fbx")

    glb_lod0 = os.path.join(out_dir, f"{model_name}_LOD0.glb")
    glb_lod1 = os.path.join(out_dir, f"{model_name}_LOD1.glb")
    glb_lod2 = os.path.join(out_dir, f"{model_name}_LOD2.glb")

    bpy.ops.export_scene.fbx(filepath=fbx_path_1, use_selection=True)
    bpy.ops.export_scene.fbx(filepath=fbx_path_2, use_selection=True)

    bpy.ops.export_scene.gltf(filepath=glb_lod0, export_format='GLB', use_selection=True)
    bpy.ops.export_scene.gltf(filepath=glb_lod1, export_format='GLB', use_selection=True)
    bpy.ops.export_scene.gltf(filepath=glb_lod2, export_format='GLB', use_selection=True)

    print(f"✅ Generated & Exported AAA 3D Model GLB/FBX for {model_name}")


def main():
    print("🚀 Starting AAA 3D asset generation for ALL faction units...")

    models_to_generate = []

    for category, folder in [('unit', UNITS_DIR), ('building', BUILDINGS_DIR)]:
        for filename in os.listdir(folder):
            if filename.endswith('.glb'):
                model_base = filename.replace('_LOD0.glb', '').replace('_LOD1.glb', '').replace('_LOD2.glb', '').replace('.glb', '')
                if model_base not in PRESERVE_MODELS and model_base not in [m[0] for m in models_to_generate]:
                    models_to_generate.append((model_base, category))

    print(f"Found {len(models_to_generate)} models to generate...")

    for model_name, category in models_to_generate:
        # Check model types by naming pattern
        if 'Rifleman' in model_name or 'Trooper' in model_name or 'Engineer' in model_name or 'Medic' in model_name or 'Sniper' in model_name or 'Grenadier' in model_name or 'Lancer' in model_name or 'Officer' in model_name or 'Hero' in model_name:
            build_infantry(model_name)
        elif 'Harvester' in model_name or 'Carrier' in model_name or 'Collector' in model_name or 'Bogatyr' in model_name or 'Pioneer' in model_name or 'Yuan' in model_name or 'Probabilist' in model_name:
            build_harvester(model_name)
        elif 'Tank' in model_name or 'MBT' in model_name or 'Granit' in model_name or 'Bulwark' in model_name or 'Qinglong' in model_name or 'Timeline' in model_name or 'Voevoda' in model_name:
            build_heavy_tank(model_name)
        elif 'Scout' in model_name or 'Sickle' in model_name or 'Rys' in model_name or 'Parallax' in model_name or 'Kestrel' in model_name or 'Corvette' in model_name:
            build_scout_vehicle(model_name)
        elif 'Artillery' in model_name or 'MLRS' in model_name or 'Zarevo' in model_name or 'Monsoon' in model_name or 'Delta' in model_name:
            build_artillery_vehicle(model_name)
        elif 'Walker' in model_name or 'Airavata' in model_name or 'Kamakiri' in model_name:
            build_walker_mecha(model_name)
        elif 'Gunship' in model_name or 'Interceptor' in model_name or 'VTOL' in model_name or 'Airship' in model_name or 'Jet' in model_name or 'Krechet' in model_name or 'Korshun' in model_name or 'Trail' in model_name or 'Gap' in model_name:
            build_aircraft(model_name)
        elif 'Submarine' in model_name or 'Cruiser' in model_name or 'Destroyer' in model_name or 'Boat' in model_name or 'Carrier' in model_name or 'Frigate' in model_name:
            build_naval(model_name)
        elif category == 'unit':
            build_heavy_tank(model_name)
        else:
            build_heavy_tank(model_name)

        export_model_files(model_name, category)

    print("🎉 All 3D unit models generated successfully!")

if __name__ == '__main__':
    main()
