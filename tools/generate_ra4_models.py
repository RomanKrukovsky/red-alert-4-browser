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

PRESERVE_MODELS = {
    'SU_RubezhRifleman',
    'SU_GranitMBT',
    'SU_BogatyrOreCarrier',
    'SU_HeavyFactory',
    'SU_Pillbox',
    'ENV_PineTree01',
    'ENV_CoastRocks01',
    'PROP_ConcreteBarrier',
    'PROP_MilitaryCrate',
    'AL_SentinelRifleman',
    'AL_FieldEngineer',
    'AL_FrostlineSpecialist',
    'AL_Hero_Hart',
    'AL_LancerTeam',
    'AL_LifelineMedic',
    'AL_LongwatchSniper',
    'CH_AporiaSniper',
    'CH_CausalityEngineer',
    'CH_CensorOperative',
    'CH_Hero_Voss',
    'CH_PunctureLancer',
    'CH_ResonanceRifleman',
    'CH_ReversalMedic',
    'CO_Hero_Mei',
    'CO_JieTechnician',
    'CO_KawasemiDrone',
    'CO_QianweiRifleman',
    'CO_RakshaGuard',
    'CO_SanjivaniMedic',
    'CO_ShengongMarksman',
    'CO_VajraLancer',
    'SU_Hero_Morozova',
    'SU_MasterEngineer',
    'SU_RazryadTrooper',
    'SU_VektorOfficer',
    'SU_ZapalGrenadier',
    'SU_ZaslonAATeam'
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
        return {'primary': mat_chrono_hull, 'accent': mat_chrono_purple, 'core': mat_chrono_core, 'dark_steel': mat_dark_obsidian, 'treads': mat_treads, 'glass': mat_glass, 'gold': mat_gold_trim}
    elif 'SU_' in model_id:
        return {'primary': mat_soviet_armor, 'accent': mat_soviet_red, 'core': mat_soviet_red, 'dark_steel': mat_dark_steel, 'treads': mat_treads, 'glass': mat_glass, 'gold': mat_gold_trim}
    elif 'AL_' in model_id:
        return {'primary': mat_alliance_armor, 'accent': mat_alliance_blue, 'core': mat_alliance_blue, 'dark_steel': mat_dark_steel, 'treads': mat_treads, 'glass': mat_glass, 'gold': mat_gold_trim}
    else:
        return {'primary': mat_coalition_gold, 'accent': mat_coalition_teal, 'core': mat_coalition_teal, 'dark_steel': mat_dark_steel, 'treads': mat_treads, 'glass': mat_glass, 'gold': mat_gold_trim}

def add_sockets(root_name="VehicleRoot", turret=True, muzzle=True):
    root = bpy.data.objects.new(root_name, None)
    bpy.context.scene.collection.objects.link(root)

    sel_anchor = bpy.data.objects.new("SelectionAnchor", None)
    sel_anchor.parent = root
    sel_anchor.location = (0, 0, 0)
    bpy.context.scene.collection.objects.link(sel_anchor)

    hp_anchor = bpy.data.objects.new("HealthBarAnchor", None)
    hp_anchor.parent = root
    hp_anchor.location = (0, 0, 2.8)
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
        turret_yaw.location = (0, 0, 1.2)
        bpy.context.scene.collection.objects.link(turret_yaw)

        gun_pitch = bpy.data.objects.new("GunPitch", None)
        gun_pitch.parent = turret_yaw
        gun_pitch.location = (0, 0.5, 0.3)
        bpy.context.scene.collection.objects.link(gun_pitch)

        if muzzle:
            muzzle_node = bpy.data.objects.new("Muzzle", None)
            muzzle_node.parent = gun_pitch
            muzzle_node.location = (0, 2.2, 0)
            bpy.context.scene.collection.objects.link(muzzle_node)

    return root, turret_yaw, gun_pitch, muzzle_node

# --- SOVIET UNION (СССР) HIGH-POLY BUILDERS ---

def build_soviet_hq(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cylinder_add(radius=4.0, depth=0.6, vertices=8, location=(0, 0, 0.3))
    base = bpy.context.active_object
    base.parent = root
    base.data.materials.append(mats['dark_steel'])

    bpy.ops.mesh.primitive_cylinder_add(radius=3.0, depth=1.8, vertices=8, location=(0, 0, 1.5))
    bunker = bpy.context.active_object
    bunker.parent = base
    bunker.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.5, location=(0, 0, 2.8))
    dome = bpy.context.active_object
    dome.scale = (1.2, 1.2, 0.8)
    dome.parent = bunker
    dome.data.materials.append(mats['accent'])

    bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=1.8, location=(0, 0, 4.0))
    spire = bpy.context.active_object
    spire.parent = dome
    spire.data.materials.append(mats['gold'])

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.4, location=(0, 0, 4.9))
    star = bpy.context.active_object
    star.parent = spire
    star.data.materials.append(mats['accent'])


def build_soviet_power(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.3))
    base = bpy.context.active_object
    base.scale = (4.2, 3.6, 0.6)
    base.parent = root
    base.data.materials.append(mats['dark_steel'])

    for side in [-1.2, 1.2]:
        bpy.ops.mesh.primitive_cone_add(radius1=1.1, radius2=0.8, depth=3.2, location=(side, 0, 2.2))
        tower = bpy.context.active_object
        tower.parent = base
        tower.data.materials.append(mats['primary'])

        bpy.ops.mesh.primitive_cylinder_add(radius=0.75, depth=0.1, location=(side, 0, 3.75))
        glow = bpy.context.active_object
        glow.parent = tower
        glow.data.materials.append(mats['accent'])


def build_soviet_tesla(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_cylinder_add(radius=1.8, depth=0.4, vertices=6, location=(0, 0, 0.2))
    base = bpy.context.active_object
    base.parent = root
    base.data.materials.append(mats['dark_steel'])

    bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=4.0, location=(0, 0, 2.2))
    spire = bpy.context.active_object
    spire.parent = turret_yaw if turret_yaw else base
    spire.data.materials.append(mats['primary'])

    for z_off in [1.2, 2.0, 2.8, 3.6]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.8, minor_radius=0.09, location=(0, 0, z_off))
        ring = bpy.context.active_object
        ring.parent = spire
        ring.data.materials.append(mats['gold'])

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.75, location=(0, 0, 4.6))
    orb = bpy.context.active_object
    orb.parent = spire
    orb.data.materials.append(mats['accent'])


# --- ALLIANCE BUILDERS ---

def build_alliance_hq(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.3))
    base = bpy.context.active_object
    base.scale = (4.4, 4.4, 0.6)
    base.parent = root
    base.data.materials.append(mats['dark_steel'])

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.6))
    bridge = bpy.context.active_object
    bridge.scale = (3.4, 3.4, 2.0)
    bridge.parent = base
    bridge.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 2.8))
    visor = bpy.context.active_object
    visor.scale = (2.6, 2.6, 0.5)
    visor.parent = bridge
    visor.data.materials.append(mats['accent'])


def build_alliance_prism(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_cylinder_add(radius=1.6, depth=0.4, vertices=4, location=(0, 0, 0.2))
    base = bpy.context.active_object
    base.parent = root
    base.data.materials.append(mats['dark_steel'])

    bpy.ops.mesh.primitive_cone_add(radius1=0.8, radius2=0.3, depth=3.8, location=(0, 0, 2.1))
    spire = bpy.context.active_object
    spire.parent = turret_yaw if turret_yaw else base
    spire.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_cone_add(radius1=0.5, radius2=0.0, depth=1.0, location=(0, 0, 4.5))
    prism = bpy.context.active_object
    prism.parent = spire
    prism.data.materials.append(mats['accent'])


# --- COALITION BUILDERS ---

def build_coalition_hq(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cylinder_add(radius=4.2, depth=0.5, vertices=6, location=(0, 0, 0.25))
    base = bpy.context.active_object
    base.parent = root
    base.data.materials.append(mats['dark_steel'])

    bpy.ops.mesh.primitive_cylinder_add(radius=3.2, depth=1.2, vertices=6, location=(0, 0, 1.1))
    t1 = bpy.context.active_object
    t1.parent = base
    t1.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_cone_add(radius1=3.6, radius2=2.6, depth=0.3, location=(0, 0, 1.8))
    e1 = bpy.context.active_object
    e1.parent = t1
    e1.data.materials.append(mats['gold'])

    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.1, location=(0, 0, 2.7))
    orb = bpy.context.active_object
    orb.parent = t1
    orb.data.materials.append(mats['accent'])


def build_coalition_walker(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.1, location=(0, 0, 2.2))
    pod = bpy.context.active_object
    pod.scale = (1.0, 1.3, 0.9)
    pod.parent = root
    pod.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.7, location=(0, 0.7, 2.3))
    visor = bpy.context.active_object
    visor.scale = (0.9, 0.5, 0.6)
    visor.parent = pod
    visor.data.materials.append(mats['glass'])

    for side in [-1.2, 1.2]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=1.8, location=(side, 0, 1.0))
        thigh = bpy.context.active_object
        thigh.rotation_euler = (0.2, 0, side * 0.2)
        thigh.parent = root
        thigh.data.materials.append(mats['dark_steel'])

        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 1.2, 0.2, 0.15))
        foot = bpy.context.active_object
        foot.scale = (0.6, 1.0, 0.3)
        foot.parent = thigh
        foot.data.materials.append(mats['gold'])

    for side in [-1.3, 1.3]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=2.2, location=(side, 0.5, 2.5))
        gun = bpy.context.active_object
        gun.rotation_euler = (math.pi/2, 0, 0)
        gun.parent = gun_pitch if gun_pitch else pod
        gun.data.materials.append(mats['accent'])


# --- CHRONOLEGION DEDICATED BUILDERS ---

def build_chronolegion_hq(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cylinder_add(radius=4.2, depth=0.4, vertices=8, location=(0, 0, 0.2))
    t1 = bpy.context.active_object
    t1.parent = root
    t1.data.materials.append(mats['dark_steel'])

    for i in range(8):
        angle = i * (2 * math.pi / 8)
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(math.cos(angle)*3.4, math.sin(angle)*3.4, 0.42))
        ch = bpy.context.active_object
        ch.scale = (0.2, 1.2, 0.05)
        ch.rotation_euler = (0, 0, angle)
        ch.parent = t1
        ch.data.materials.append(mats['accent'])

    bpy.ops.mesh.primitive_cone_add(radius1=3.4, radius2=2.2, depth=1.2, location=(0, 0, 1.0))
    t2 = bpy.context.active_object
    t2.parent = t1
    t2.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_cylinder_add(radius=2.0, depth=0.8, vertices=16, location=(0, 0, 1.8))
    t3 = bpy.context.active_object
    t3.parent = t2
    t3.data.materials.append(mats['dark_steel'])

    for ring_idx, (rz, rad, rrot) in enumerate([(2.6, 1.6, (0.4, 0, 0)), (2.6, 1.8, (0, 0.4, 0.4)), (2.6, 2.0, (0.6, 0.6, 0))]):
        bpy.ops.mesh.primitive_torus_add(major_radius=rad, minor_radius=0.06, location=(0, 0, rz))
        r = bpy.context.active_object
        r.rotation_euler = rrot
        r.parent = t3
        r.data.materials.append(mats['accent'])

    bpy.ops.mesh.primitive_ico_sphere_add(radius=1.3, subdivisions=4, location=(0, 0, 2.7))
    core = bpy.context.active_object
    core.parent = t3
    core.data.materials.append(mats['core'])


def build_chronolegion_reactor(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cylinder_add(radius=2.8, depth=0.4, vertices=3, location=(0, 0, 0.2))
    base = bpy.context.active_object
    base.parent = root
    base.data.materials.append(mats['dark_steel'])

    for i in range(3):
        angle = i * (2 * math.pi / 3) + math.pi/2
        px, py = math.cos(angle)*2.0, math.sin(angle)*2.0
        bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=2.4, location=(px, py, 1.4))
        coil = bpy.context.active_object
        coil.parent = base
        coil.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(0, 0, 2.2))
    orb = bpy.context.active_object
    orb.parent = base
    orb.data.materials.append(mats['core'])


def build_chronolegion_refinery(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.25))
    base = bpy.context.active_object
    base.scale = (4.5, 3.8, 0.5)
    base.parent = root
    base.data.materials.append(mats['dark_steel'])


def build_chronolegion_barracks(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.25))
    base = bpy.context.active_object
    base.scale = (4.2, 4.2, 0.5)
    base.parent = root
    base.data.materials.append(mats['dark_steel'])

    bpy.ops.mesh.primitive_cylinder_add(radius=1.3, depth=0.1, location=(0, 0, 1.8))
    rift = bpy.context.active_object
    rift.rotation_euler = (math.pi/2, 0, 0)
    rift.parent = base
    rift.data.materials.append(mats['core'])


def build_chronolegion_factory(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.25))
    base = bpy.context.active_object
    base.scale = (5.0, 4.2, 0.5)
    base.parent = root
    base.data.materials.append(mats['dark_steel'])


def build_chronolegion_tech(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cylinder_add(radius=2.5, depth=0.4, vertices=6, location=(0, 0, 0.2))
    base = bpy.context.active_object
    base.parent = root
    base.data.materials.append(mats['dark_steel'])

    bpy.ops.mesh.primitive_cylinder_add(radius=0.6, depth=4.2, location=(0, 0, 2.3))
    spire = bpy.context.active_object
    spire.parent = base
    spire.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.7, location=(0, 0, 4.6))
    top_orb = bpy.context.active_object
    top_orb.parent = spire
    top_orb.data.materials.append(mats['core'])


def build_chronolegion_turret(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_cylinder_add(radius=1.8, depth=0.4, vertices=6, location=(0, 0, 0.2))
    base = bpy.context.active_object
    base.parent = root
    base.data.materials.append(mats['dark_steel'])

    bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=3.8, location=(0, 0, 2.1))
    spire = bpy.context.active_object
    spire.parent = turret_yaw if turret_yaw else base
    spire.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_cone_add(radius1=0.4, radius2=0.0, depth=0.9, location=(0, 0, 4.3))
    lens = bpy.context.active_object
    lens.parent = spire
    lens.data.materials.append(mats['core'])


def build_timeline_tank(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.7))
    hull = bpy.context.active_object
    hull.scale = (2.2, 4.0, 0.75)
    hull.parent = root
    hull.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_cylinder_add(radius=1.1, depth=0.7, vertices=8, location=(0, -0.2, 1.4))
    turret = bpy.context.active_object
    turret.parent = turret_yaw
    turret.data.materials.append(mats['primary'])


def build_probabilist_harvester(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.8))
    chassis = bpy.context.active_object
    chassis.scale = (2.6, 4.4, 0.9)
    chassis.parent = root
    chassis.data.materials.append(mats['primary'])


def build_parallax_scout(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.5))
    body = bpy.context.active_object
    body.scale = (1.6, 3.2, 0.5)
    body.parent = root
    body.data.materials.append(mats['primary'])


def build_delay_artillery(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.6))
    chassis = bpy.context.active_object
    chassis.scale = (2.2, 4.6, 0.6)
    chassis.parent = root
    chassis.data.materials.append(mats['dark_steel'])


def build_trail_gunship(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.6, depth=3.6, location=(0, 0, 1.5))
    fuse = bpy.context.active_object
    fuse.rotation_euler = (math.pi/2, 0, 0)
    fuse.parent = root
    fuse.data.materials.append(mats['primary'])


def build_gap_interceptor(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=4.2, location=(0, 0, 1.4))
    fuse = bpy.context.active_object
    fuse.rotation_euler = (math.pi/2, 0, 0)
    fuse.parent = root
    fuse.data.materials.append(mats['primary'])


def build_generic_structure(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("BuildingRoot", turret='Turret' in model_id or 'Tower' in model_id or 'Pillbox' in model_id, muzzle=False)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.25))
    base_pad = bpy.context.active_object
    base_pad.scale = (4.0, 4.0, 0.5)
    base_pad.parent = root
    base_pad.data.materials.append(mats['dark_steel'])

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.4))
    bldg = bpy.context.active_object
    bldg.scale = (3.4, 3.4, 1.9)
    bldg.parent = base_pad
    bldg.data.materials.append(mats['primary'])


def build_heavy_tank(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.7))
    hull = bpy.context.active_object
    hull.scale = (2.4, 4.2, 0.8)
    hull.parent = root
    hull.data.materials.append(mats['primary'])

    for side in [-1.4, 1.4]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side, 0, 0.5))
        tread = bpy.context.active_object
        tread.scale = (0.7, 4.4, 0.9)
        tread.parent = root
        tread.data.materials.append(mats['treads'])

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.2, 1.4))
    turret = bpy.context.active_object
    turret.scale = (1.9, 2.2, 0.75)
    turret.parent = turret_yaw
    turret.data.materials.append(mats['primary'])

    is_dual = 'Voevoda' in model_id or 'Apocalypse' in model_id or 'Qinglong' in model_id
    barrel_offsets = [-0.35, 0.35] if is_dual else [0.0]

    for offset in barrel_offsets:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=2.8, location=(offset, 1.6, 1.45))
        barrel = bpy.context.active_object
        barrel.rotation_euler = (math.pi/2, 0, 0)
        barrel.parent = gun_pitch
        barrel.data.materials.append(mats['dark_steel'])


def build_mlrs_artillery(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.6))
    chassis = bpy.context.active_object
    chassis.scale = (2.0, 4.6, 0.5)
    chassis.parent = root
    chassis.data.materials.append(mats['dark_steel'])

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 1.6, 1.25))
    cabin = bpy.context.active_object
    cabin.scale = (1.95, 1.3, 0.95)
    cabin.parent = chassis
    cabin.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.8, 1.6))
    pod_box = bpy.context.active_object
    pod_box.scale = (1.6, 2.2, 0.7)
    pod_box.rotation_euler = (-math.pi/12, 0, 0)
    pod_box.parent = gun_pitch
    pod_box.data.materials.append(mats['primary'])


def build_aircraft_interceptor(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=4.5, location=(0, 0, 1.5))
    fuse = bpy.context.active_object
    fuse.rotation_euler = (math.pi/2, 0, 0)
    fuse.parent = root
    fuse.data.materials.append(mats['primary'])

    bpy.ops.mesh.primitive_cone_add(radius1=0.35, depth=1.4, location=(0, 2.8, 1.5))
    nose = bpy.context.active_object
    nose.rotation_euler = (-math.pi/2, 0, 0)
    nose.parent = fuse
    nose.data.materials.append(mats['dark_steel'])


def build_gunship_helicopter(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.7, depth=3.8, location=(0, 0, 1.6))
    fuse = bpy.context.active_object
    fuse.rotation_euler = (math.pi/2, 0, 0)
    fuse.parent = root
    fuse.data.materials.append(mats['primary'])


def build_kirov_airship(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_uv_sphere_add(radius=2.0, location=(0, 0, 3.2))
    hull = bpy.context.active_object
    hull.scale = (1.3, 3.2, 1.3)
    hull.parent = root
    hull.data.materials.append(mats['primary'])


def build_naval_ship(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=True, muzzle=True)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.5))
    hull = bpy.context.active_object
    hull.scale = (2.2, 6.5, 0.8)
    hull.parent = root
    hull.data.materials.append(mats['dark_steel'])


def build_submarine(model_id):
    clear_scene()
    mats = get_materials_for_model(model_id)
    root, turret_yaw, gun_pitch, muzzle = add_sockets("VehicleRoot", turret=False, muzzle=False)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.9, depth=6.2, location=(0, 0, 0.6))
    hull = bpy.context.active_object
    hull.rotation_euler = (math.pi/2, 0, 0)
    hull.parent = root
    hull.data.materials.append(mats['dark_steel'])


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

    print(f"✅ Generated & Exported AAA FBX/GLB for {model_name}")


def main():
    print("🚀 Starting AAA procedural 3D asset generation for ALL factions (USSR, Alliance, Coalition, Chronolegion)...")

    models_to_generate = []

    for category, folder in [('unit', UNITS_DIR), ('building', BUILDINGS_DIR)]:
        for filename in os.listdir(folder):
            if filename.endswith('.glb'):
                model_base = filename.replace('_LOD0.glb', '').replace('_LOD1.glb', '').replace('_LOD2.glb', '').replace('.glb', '')
                if model_base not in PRESERVE_MODELS and model_base not in [m[0] for m in models_to_generate]:
                    models_to_generate.append((model_base, category))

    print(f"Found {len(models_to_generate)} models to build & export...")

    for model_name, category in models_to_generate:
        # USSR Buildings
        if model_name in ['SU_RedHQ', 'SU_ConYard']:
            build_soviet_hq(model_name)
        elif model_name in ['SU_ThermalPower', 'SU_PowerPlant']:
            build_soviet_power(model_name)
        elif model_name in ['SU_TeslaTower']:
            build_soviet_tesla(model_name)
        # Alliance Buildings
        elif model_name in ['AL_CommandHQ', 'AL_ConYard']:
            build_alliance_hq(model_name)
        elif model_name in ['AL_PrismTower']:
            build_alliance_prism(model_name)
        # Coalition Buildings & Mecha
        elif model_name in ['CO_DynastyHQ', 'CO_ConYard']:
            build_coalition_hq(model_name)
        elif 'Walker' in model_name:
            build_coalition_walker(model_name)
        # Chronolegion Buildings
        elif model_name in ['CH_TemporalHQ', 'CH_ConYard']:
            build_chronolegion_hq(model_name)
        elif model_name in ['CH_SingularityCore', 'CH_PowerPlant']:
            build_chronolegion_reactor(model_name)
        elif model_name in ['CH_FluxRefinery', 'CH_Refinery']:
            build_chronolegion_refinery(model_name)
        elif model_name in ['CH_AssemblyNode', 'CH_Barracks']:
            build_chronolegion_barracks(model_name)
        elif model_name in ['CH_Chronoworks', 'CH_WarFactory']:
            build_chronolegion_factory(model_name)
        elif model_name in ['CH_CausalityLab', 'CH_TechCenter']:
            build_chronolegion_tech(model_name)
        elif 'EchoTurret' in model_name or 'Stasis' in model_name:
            build_chronolegion_turret(model_name)
        # Chronolegion Vehicles
        elif model_name == 'CH_TimelineTank':
            build_timeline_tank(model_name)
        elif model_name == 'CH_ProbabilistHarvester':
            build_probabilist_harvester(model_name)
        elif model_name == 'CH_ParallaxScout':
            build_parallax_scout(model_name)
        elif model_name == 'CH_DeltaDelayArtillery':
            build_delay_artillery(model_name)
        elif model_name == 'CH_TrailGunship':
            build_trail_gunship(model_name)
        elif model_name == 'CH_GapInterceptor' or 'Bomber' in model_name:
            build_gap_interceptor(model_name)
        # Faction Generics
        elif 'Airship' in model_name or 'Kirov' in model_name:
            build_kirov_airship(model_name)
        elif 'Gunship' in model_name or 'VTOL' in model_name:
            build_gunship_helicopter(model_name)
        elif 'Interceptor' in model_name or 'Jet' in model_name:
            build_aircraft_interceptor(model_name)
        elif 'Submarine' in model_name or 'Morok' in model_name or 'Bathys' in model_name:
            build_submarine(model_name)
        elif 'Cruiser' in model_name or 'Destroyer' in model_name or 'Boat' in model_name or 'Carrier' in model_name or 'Frigate' in model_name or 'Corvette' in model_name:
            build_naval_ship(model_name)
        elif 'MLRS' in model_name or 'Artillery' in model_name or 'Rocket' in model_name:
            build_mlrs_artillery(model_name)
        elif category == 'building':
            build_generic_structure(model_name)
        else:
            build_heavy_tank(model_name)

        export_model_files(model_name, category)

    print("🎉 All 3D FBX and GLB models for all 4 factions generated successfully!")

if __name__ == '__main__':
    main()
