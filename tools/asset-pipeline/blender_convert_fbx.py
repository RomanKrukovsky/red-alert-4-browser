import bpy
import sys
import os

def convert_fbx_to_glb_lods(fbx_path, output_dir, asset_name):
    os.makedirs(output_dir, exist_ok=True)

    # 1. Reset Scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # 2. Import FBX
    bpy.ops.import_scene.fbx(filepath=fbx_path)

    # Select all imported meshes
    imported_meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not imported_meshes:
        print(f"Warning: No mesh objects found in {fbx_path}")
        return

    # Join meshes if multiple
    bpy.ops.object.select_all(action='DESELECT')
    for obj in imported_meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = imported_meshes[0]
    if len(imported_meshes) > 1:
        bpy.ops.object.join()

    active_obj = bpy.context.view_layer.objects.active

    # Apply all transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Ensure material exists
    if len(active_obj.data.materials) == 0:
        mat = bpy.data.materials.new(name=f"Mat_{asset_name}")
        mat.use_nodes = True
        active_obj.data.materials.append(mat)

    # --- Export LOD0 ---
    lod0_path = os.path.join(output_dir, f"{asset_name}_LOD0.glb")
    bpy.ops.export_scene.gltf(
        filepath=lod0_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )

    # --- Export LOD1 (50% Decimated) ---
    decimate_mod = active_obj.modifiers.new(name="Decimate_LOD1", type='DECIMATE')
    decimate_mod.ratio = 0.5
    bpy.ops.object.modifier_apply(modifier="Decimate_LOD1")

    lod1_path = os.path.join(output_dir, f"{asset_name}_LOD1.glb")
    bpy.ops.export_scene.gltf(
        filepath=lod1_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )

    # --- Export LOD2 (20% Decimated) ---
    decimate_mod2 = active_obj.modifiers.new(name="Decimate_LOD2", type='DECIMATE')
    decimate_mod2.ratio = 0.4
    bpy.ops.object.modifier_apply(modifier="Decimate_LOD2")

    lod2_path = os.path.join(output_dir, f"{asset_name}_LOD2.glb")
    bpy.ops.export_scene.gltf(
        filepath=lod2_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )

    print(f"Successfully exported LOD0, LOD1, LOD2 for {asset_name}")

if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:]
    fbx_file = args[0]
    out_dir = args[1]
    name = args[2]
    convert_fbx_to_glb_lods(fbx_file, out_dir, name)
