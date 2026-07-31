import {
  Engine, Scene, Vector3, HemisphericLight, DirectionalLight, PointLight,
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Mesh, SceneLoader, TransformNode,
  DefaultRenderingPipeline, DynamicTexture, ShadowGenerator
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import { WorldSnapshot } from '@ra4/shared-types';
import { RTSCamera } from './camera.js';
import { useUIStore } from '@ra4/ui';

export class RTSRenderer {
  public engine: Engine;
  public scene: Scene;
  public rtsCamera: RTSCamera;
  public entityMeshes: Map<number, TransformNode> = new Map();
  public selectionRings: Map<number, Mesh> = new Map();
  public loadedTemplates: Map<string, Mesh> = new Map();
  public shadowGenerator: ShadowGenerator | null = null;
  public pipeline: DefaultRenderingPipeline | null = null;

  private materials: Map<string, StandardMaterial | PBRMaterial> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.04, 0.06, 0.1, 1);

    // RTS Camera
    this.rtsCamera = new RTSCamera(this.scene, canvas);

    // Dynamic Directional Sunlight with Cascaded Soft Shadows
    const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemiLight.intensity = 0.45;
    hemiLight.groundColor = new Color3(0.08, 0.1, 0.14);

    const dirLight = new DirectionalLight('dir', new Vector3(-1.4, -2.8, -1.2), this.scene);
    dirLight.position = new Vector3(60, 100, 60);
    dirLight.intensity = 1.6;

    this.shadowGenerator = new ShadowGenerator(2048, dirLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 16;

    // AAA Post-Processing Pipeline
    this.initPostProcessing();
    this.initMaterials();
    this.createTacticalTerrain();
    this.preloadGLBModels();
    this.spawnEnvironmentDecor();

    // Main Render & Animation Loop
    this.engine.runRenderLoop(() => {
      this.rtsCamera.update();
      
      // Rotate selection rings
      for (const ring of this.selectionRings.values()) {
        if (ring.isVisible) {
          ring.rotation.y += 0.02;
        }
      }

      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  get camera() {
    return this.rtsCamera.camera;
  }

  private initPostProcessing(): void {
    try {
      this.pipeline = new DefaultRenderingPipeline('ra4Pipeline', true, this.scene, [this.camera]);
      this.pipeline.bloomEnabled = true;
      this.pipeline.bloomThreshold = 0.65;
      this.pipeline.bloomWeight = 0.35;
      this.pipeline.bloomKernel = 64;
      this.pipeline.fxaaEnabled = true;
      this.pipeline.chromaticAberrationEnabled = true;
      this.pipeline.chromaticAberration.aberrationAmount = 2.5;
    } catch (e) {
      console.warn('[RTSRenderer] Post-processing pipeline initialization warning:', e);
    }
  }

  private initMaterials(): void {
    const createStdMat = (name: string, color: Color3, glow: Color3) => {
      const mat = new StandardMaterial(name, this.scene);
      mat.diffuseColor = color;
      mat.specularColor = new Color3(0.4, 0.4, 0.4);
      mat.emissiveColor = glow;
      this.materials.set(name, mat);
    };

    createStdMat('mat_SU', new Color3(0.85, 0.15, 0.15), new Color3(0.25, 0.04, 0.04));
    createStdMat('mat_AL', new Color3(0.15, 0.5, 0.9), new Color3(0.04, 0.1, 0.25));
    createStdMat('mat_CO', new Color3(0.15, 0.75, 0.35), new Color3(0.04, 0.18, 0.08));
    createStdMat('mat_CH', new Color3(0.65, 0.2, 0.9), new Color3(0.15, 0.04, 0.22));

    const ringMat = new StandardMaterial('mat_ring', this.scene);
    ringMat.diffuseColor = new Color3(0.0, 1.0, 0.8);
    ringMat.emissiveColor = new Color3(0.0, 0.6, 0.5);
    this.materials.set('mat_ring', ringMat);

    const validMat = new StandardMaterial('mat_ghost_valid', this.scene);
    validMat.diffuseColor = new Color3(0, 1, 0.4);
    validMat.alpha = 0.55;
    this.materials.set('mat_ghost_valid', validMat);

    const invalidMat = new StandardMaterial('mat_ghost_invalid', this.scene);
    invalidMat.diffuseColor = new Color3(1, 0.1, 0.1);
    invalidMat.alpha = 0.55;
    this.materials.set('mat_ghost_invalid', invalidMat);
  }

  private createTacticalTerrain(): void {
    const ground = MeshBuilder.CreateGround('ground', { width: 64, height: 64, subdivisions: 64 }, this.scene);
    ground.position = new Vector3(32, 0, 32);
    ground.receiveShadows = true;

    // Tactical Grid Dynamic Texture
    const dynamicTex = new DynamicTexture('gridTex', 1024, this.scene, true);
    const ctx = dynamicTex.getContext();
    ctx.fillStyle = '#0c121e';
    ctx.fillRect(0, 0, 1024, 1024);

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.15)';
    ctx.lineWidth = 2;
    const step = 1024 / 32;
    for (let i = 0; i <= 1024; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 1024);
      ctx.moveTo(0, i); ctx.lineTo(1024, i);
      ctx.stroke();
    }
    dynamicTex.update();

    const pbrGround = new PBRMaterial('pbrGround', this.scene);
    pbrGround.albedoTexture = dynamicTex;
    pbrGround.roughness = 0.65;
    pbrGround.metallic = 0.25;

    ground.material = pbrGround;
  }

  private async preloadGLBModels(): Promise<void> {
    const modelSpecs = [
      { id: 'SU_GranitMBT', url: '/assets/models/units/SU_GranitMBT.glb' },
      { id: 'SU_BogatyrOreCarrier', url: '/assets/models/units/SU_BogatyrOreCarrier.glb' },
      { id: 'SU_RubezhRifleman', url: '/assets/models/units/SU_RubezhRifleman.glb' },
      { id: 'SU_HeavyFactory', url: '/assets/models/buildings/SU_HeavyFactory.glb' },
      { id: 'SU_Pillbox', url: '/assets/models/buildings/SU_Pillbox.glb' }
    ];

    for (const spec of modelSpecs) {
      try {
        const result = await SceneLoader.ImportMeshAsync('', '', spec.url, this.scene);
        const root = result.meshes[0] as Mesh;
        if (root) {
          root.setEnabled(false);
          this.loadedTemplates.set(spec.id, root);
        }
      } catch (e) {
        console.warn(`[RTSRenderer] Fallback used for ${spec.id}`);
      }
    }
  }

  private async spawnEnvironmentDecor(): Promise<void> {
    try {
      const treeRes = await SceneLoader.ImportMeshAsync('', '', '/assets/models/environment/pine_tree_01.glb', this.scene);
      const treeRoot = treeRes.meshes[0] as Mesh;
      if (treeRoot) {
        treeRoot.setEnabled(false);
        const treeCoords = [[10, 10], [14, 8], [12, 16], [50, 12], [54, 15], [52, 50], [10, 52]];
        treeCoords.forEach(([tx, tz], i) => {
          const instance = treeRoot.clone(`tree_${i}`, null);
          if (instance) {
            instance.setEnabled(true);
            instance.position = new Vector3(tx, 0, tz);
            if (this.shadowGenerator) {
              this.shadowGenerator.addShadowCaster(instance, true);
            }
          }
        });
      }

      const rockRes = await SceneLoader.ImportMeshAsync('', '', '/assets/models/environment/coast_rocks_01.glb', this.scene);
      const rockRoot = rockRes.meshes[0] as Mesh;
      if (rockRoot) {
        rockRoot.setEnabled(false);
        const rockCoords = [[5, 30], [58, 30], [30, 5], [32, 58]];
        rockCoords.forEach(([rx, rz], i) => {
          const instance = rockRoot.clone(`rock_${i}`, null);
          if (instance) {
            instance.setEnabled(true);
            instance.position = new Vector3(rx, 0, rz);
          }
        });
      }
    } catch (e) {
      console.warn('[RTSRenderer] Environment decor warning:', e);
    }
  }

  public updateScene(snapshot: WorldSnapshot): void {
    const activeIds = new Set<number>();
    const selectedIds = new Set(useUIStore.getState().selectedEntityIds);

    for (const e of snapshot.entities) {
      activeIds.add(e.id);
      let node = this.entityMeshes.get(e.id);

      const wx = e.position.x / 1000;
      const wz = e.position.y / 1000;

      if (!node) {
        const template = this.loadedTemplates.get(e.specId);
        if (template) {
          node = template.clone(`entity_${e.id}`, null) as TransformNode;
          node.setEnabled(true);
          if (this.shadowGenerator) {
            for (const m of node.getChildMeshes()) {
              this.shadowGenerator.addShadowCaster(m, true);
            }
          }
        } else {
          if (e.isBuilding) {
            node = MeshBuilder.CreateBox(`entity_${e.id}`, { width: 3, height: 2, depth: 3 }, this.scene);
          } else {
            node = MeshBuilder.CreateCylinder(`entity_${e.id}`, { diameter: 1.2, height: 1.0 }, this.scene);
          }
          const matName = `mat_${e.factionId}`;
          (node as Mesh).material = this.materials.get(matName) ?? this.materials.get('mat_SU')!;
        }

        this.entityMeshes.set(e.id, node);
      }

      node.position.x = wx;
      node.position.z = wz;
      node.position.y = 0;

      // Selection Ring
      let ring = this.selectionRings.get(e.id);
      if (selectedIds.has(e.id)) {
        if (!ring) {
          ring = MeshBuilder.CreateTorus(`ring_${e.id}`, { diameter: e.isBuilding ? 3.8 : 1.8, thickness: 0.12 }, this.scene);
          ring.material = this.materials.get('mat_ring')!;
          this.selectionRings.set(e.id, ring);
        }
        ring.position.x = wx;
        ring.position.z = wz;
        ring.position.y = 0.06;
        ring.isVisible = true;
      } else if (ring) {
        ring.isVisible = false;
      }
    }

    // Render Tracer Lines & Muzzle Light Flashes for Shot FX
    if (snapshot.shotFX) {
      for (const shot of snapshot.shotFX) {
        const line = MeshBuilder.CreateLines(`tracer_${Date.now()}_${Math.random()}`, {
          points: [
            new Vector3(shot.startX / 1000, 1.2, shot.startY / 1000),
            new Vector3(shot.targetX / 1000, 1.2, shot.targetY / 1000)
          ]
        }, this.scene);
        line.color = new Color3(1.0, 0.85, 0.25);

        const flash = new PointLight(`flash_${Date.now()}`, new Vector3(shot.startX / 1000, 1.4, shot.startY / 1000), this.scene);
        flash.diffuse = new Color3(1.0, 0.7, 0.2);
        flash.intensity = 4.0;
        flash.range = 8.0;

        setTimeout(() => {
          line.dispose();
          flash.dispose();
        }, 80);
      }
    }

    // Cleanup destroyed entities
    for (const [id, node] of this.entityMeshes.entries()) {
      if (!activeIds.has(id)) {
        node.dispose();
        this.entityMeshes.delete(id);
        const ring = this.selectionRings.get(id);
        if (ring) {
          ring.dispose();
          this.selectionRings.delete(id);
        }
      }
    }
  }

  public ghostMesh: Mesh | null = null;

  public setPlacementGhost(show: boolean, width: number = 3, depth: number = 3): void {
    if (!show) {
      if (this.ghostMesh) {
        this.ghostMesh.dispose();
        this.ghostMesh = null;
      }
      return;
    }

    if (!this.ghostMesh) {
      this.ghostMesh = MeshBuilder.CreateBox('placement_ghost', { width, height: 1.8, depth }, this.scene);
      this.ghostMesh.material = this.materials.get('mat_ghost_valid')!;
    }
  }

  public updateGhostPosition(gx: number, gy: number, isValid: boolean): void {
    if (this.ghostMesh) {
      this.ghostMesh.position.x = gx;
      this.ghostMesh.position.z = gy;
      this.ghostMesh.position.y = 0.9;
      this.ghostMesh.material = this.materials.get(isValid ? 'mat_ghost_valid' : 'mat_ghost_invalid')!;
    }
  }

  public dispose(): void {
    if (this.ghostMesh) {
      this.ghostMesh.dispose();
    }
    for (const node of this.entityMeshes.values()) {
      node.dispose();
    }
    this.entityMeshes.clear();

    for (const template of this.loadedTemplates.values()) {
      template.dispose();
    }
    this.loadedTemplates.clear();

    if (this.pipeline) {
      this.pipeline.dispose();
    }
    this.rtsCamera.dispose();
    this.engine.dispose();
  }
}
