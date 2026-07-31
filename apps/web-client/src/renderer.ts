import { Engine, Scene, Vector3, HemisphericLight, DirectionalLight, MeshBuilder, StandardMaterial, Color3, Color4, Mesh } from '@babylonjs/core';
import { WorldSnapshot } from '@ra4/shared-types';
import { RTSCamera } from './camera.js';
import { useUIStore } from '@ra4/ui';

export class RTSRenderer {
  public engine: Engine;
  public scene: Scene;
  public rtsCamera: RTSCamera;
  public entityMeshes: Map<number, Mesh> = new Map();
  public selectionRings: Map<number, Mesh> = new Map();

  private materials: Map<string, StandardMaterial> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.03, 0.05, 0.08, 1);

    // RTS Camera (Stage 2)
    this.rtsCamera = new RTSCamera(this.scene, canvas);

    // Lighting setup
    const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemiLight.intensity = 0.6;
    hemiLight.groundColor = new Color3(0.1, 0.1, 0.15);

    const dirLight = new DirectionalLight('dir', new Vector3(-1, -2, -1), this.scene);
    dirLight.position = new Vector3(50, 80, 50);
    dirLight.intensity = 1.2;

    this.initMaterials();
    this.createTerrain();

    this.engine.runRenderLoop(() => {
      this.rtsCamera.update();
      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  get camera() {
    return this.rtsCamera.camera;
  }

  private initMaterials(): void {
    const createMat = (name: string, color: Color3, glow: Color3) => {
      const mat = new StandardMaterial(name, this.scene);
      mat.diffuseColor = color;
      mat.specularColor = new Color3(0.3, 0.3, 0.3);
      mat.emissiveColor = glow;
      this.materials.set(name, mat);
    };

    createMat('mat_SU', new Color3(0.8, 0.15, 0.15), new Color3(0.2, 0.03, 0.03));
    createMat('mat_AL', new Color3(0.15, 0.4, 0.85), new Color3(0.03, 0.08, 0.2));
    createMat('mat_CO', new Color3(0.15, 0.7, 0.35), new Color3(0.03, 0.15, 0.07));
    createMat('mat_CH', new Color3(0.6, 0.2, 0.85), new Color3(0.12, 0.04, 0.2));
    createMat('mat_ground', new Color3(0.12, 0.16, 0.22), new Color3(0.02, 0.03, 0.04));
    createMat('mat_ring', new Color3(0.0, 1.0, 0.8), new Color3(0.0, 0.4, 0.3));
  }

  private createTerrain(): void {
    const ground = MeshBuilder.CreateGround('ground', { width: 64, height: 64, subdivisions: 32 }, this.scene);
    ground.position = new Vector3(32, 0, 32);
    ground.material = this.materials.get('mat_ground')!;
  }

  public updateScene(snapshot: WorldSnapshot): void {
    const activeIds = new Set<number>();
    const selectedIds = new Set(useUIStore.getState().selectedEntityIds);

    for (const e of snapshot.entities) {
      activeIds.add(e.id);
      let mesh = this.entityMeshes.get(e.id);

      const wx = e.position.x / 1000;
      const wz = e.position.y / 1000;
      const wy = e.isBuilding ? 1.0 : 0.5;

      if (!mesh) {
        if (e.isBuilding) {
          mesh = MeshBuilder.CreateBox(`entity_${e.id}`, { width: 3, height: 2, depth: 3 }, this.scene);
        } else {
          mesh = MeshBuilder.CreateCylinder(`entity_${e.id}`, { diameter: 1.2, height: 1.0 }, this.scene);
        }

        const matName = `mat_${e.factionId}`;
        mesh.material = this.materials.get(matName) ?? this.materials.get('mat_SU')!;
        this.entityMeshes.set(e.id, mesh);
      }

      mesh.position.x = wx;
      mesh.position.z = wz;
      mesh.position.y = wy;

      // Selection Ring
      let ring = this.selectionRings.get(e.id);
      if (selectedIds.has(e.id)) {
        if (!ring) {
          ring = MeshBuilder.CreateTorus(`ring_${e.id}`, { diameter: e.isBuilding ? 3.5 : 1.6, thickness: 0.1 }, this.scene);
          ring.material = this.materials.get('mat_ring')!;
          this.selectionRings.set(e.id, ring);
        }
        ring.position.x = wx;
        ring.position.z = wz;
        ring.position.y = 0.05;
        ring.isVisible = true;
      } else if (ring) {
        ring.isVisible = false;
      }
    }

    // Cleanup destroyed entities
    for (const [id, mesh] of this.entityMeshes.entries()) {
      if (!activeIds.has(id)) {
        mesh.dispose();
        this.entityMeshes.delete(id);
        const ring = this.selectionRings.get(id);
        if (ring) {
          ring.dispose();
          this.selectionRings.delete(id);
        }
      }
    }
  }

  public dispose(): void {
    this.rtsCamera.dispose();
    this.engine.dispose();
  }
}
