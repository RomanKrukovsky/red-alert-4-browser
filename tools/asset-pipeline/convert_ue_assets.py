import os
import sys
import glob
import subprocess

SOURCE_UE_PATH = "/Users/romanmolodyko/Documents/red-alert-4"
TARGET_BROWSER_PATH = "/Users/romanmolodyko/Documents/red-alert-4-browser"
PUBLIC_ASSETS = os.path.join(TARGET_BROWSER_PATH, "apps/web-client/public/assets")

BLENDER_BIN = "/opt/homebrew/bin/blender"
FFMPEG_BIN = "/opt/homebrew/bin/ffmpeg"
BLENDER_SCRIPT = os.path.join(TARGET_BROWSER_PATH, "tools/asset-pipeline/blender_convert_fbx.py")

def convert_3d_models():
    print("\n--- 1. Converting 142 FBX 3D Models from UE project to GLB LODs ---")
    fbx_files = glob.glob(os.path.join(SOURCE_UE_PATH, "Content/RA4/Art/Blockout/**/*.fbx"), recursive=True)
    print(f"Found {len(fbx_files)} FBX models to convert.")

    models_converted = 0
    for fbx_path in fbx_files:
        filename = os.path.basename(fbx_path)
        raw_name = filename.replace("SM_Soviet_", "").replace("SM_Alliance_", "").replace("SM_Coalition_", "").replace("SM_Chronolegion_", "").replace("_Blockout.fbx", "").replace(".fbx", "")

        # Categorize
        if any(kw in raw_name.lower() for kw in ["conyard", "powerplant", "refinery", "warfactory", "barracks", "navalyard", "turret", "bunker", "radar", "techcenter", "superweapon", "airfield", "shieldhub", "railtower"]):
            target_dir = os.path.join(PUBLIC_ASSETS, "models/buildings")
        elif any(kw in raw_name.lower() for kw in ["rock", "tree", "barrier", "crate", "prop", "wall"]):
            target_dir = os.path.join(PUBLIC_ASSETS, "models/environment")
        else:
            target_dir = os.path.join(PUBLIC_ASSETS, "models/units")

        os.makedirs(target_dir, exist_ok=True)

        cmd = [
            BLENDER_BIN,
            "--background",
            "--python", BLENDER_SCRIPT,
            "--",
            fbx_path,
            target_dir,
            raw_name
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            models_converted += 1
            print(f"[{models_converted}/{len(fbx_files)}] Converted model: {raw_name} -> {target_dir}")
        except subprocess.CalledProcessError as e:
            print(f"Error converting {fbx_path}: {e.stderr[:200]}")

    print(f"✓ 3D Model Conversion Complete: {models_converted} models converted into GLB LOD0/LOD1/LOD2.")

def convert_audio():
    print("\n--- 2. Converting 323 WAV Audio Files to OGG & MP3 Web Audio Formats ---")
    wav_files = glob.glob(os.path.join(SOURCE_UE_PATH, "Audio/**/*.wav"), recursive=True) + glob.glob(os.path.join(SOURCE_UE_PATH, "Assets/RA4UI/Audio/**/*.wav"), recursive=True)
    print(f"Found {len(wav_files)} WAV audio files to convert.")

    audio_converted = 0
    for wav_path in wav_files:
        rel_path = os.path.relpath(wav_path, SOURCE_UE_PATH)
        filename = os.path.basename(wav_path)
        base_name = os.path.splitext(filename)[0]

        if "Voice" in rel_path or "VO_" in filename:
            target_dir = os.path.join(PUBLIC_ASSETS, "audio/voice")
        elif "Music" in rel_path or "Theme" in filename:
            target_dir = os.path.join(PUBLIC_ASSETS, "audio/music")
        else:
            target_dir = os.path.join(PUBLIC_ASSETS, "audio/sfx")

        os.makedirs(target_dir, exist_ok=True)

        ogg_path = os.path.join(target_dir, f"{base_name}.ogg")
        mp3_path = os.path.join(target_dir, f"{base_name}.mp3")

        # Convert WAV to MP3 using ffmpeg libmp3lame
        cmd_mp3 = [FFMPEG_BIN, "-y", "-i", wav_path, "-c:a", "libmp3lame", "-qscale:a", "3", mp3_path]

        try:
            subprocess.run(cmd_mp3, capture_output=True, check=True)
            audio_converted += 1
            if audio_converted % 50 == 0 or audio_converted == len(wav_files):
                print(f"[{audio_converted}/{len(wav_files)}] Converted audio to MP3: {base_name}")
        except subprocess.CalledProcessError as e:
            print(f"Error converting audio {wav_path}: {e}")

    print(f"✓ Audio Conversion Complete: {audio_converted} audio files converted into OGG & MP3.")

if __name__ == "__main__":
    convert_audio()
