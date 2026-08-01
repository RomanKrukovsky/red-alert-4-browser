import {
  Engine, Scene, Vector3, HemisphericLight, DirectionalLight, PointLight,
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Mesh, TransformNode,
  DefaultRenderingPipeline, ShadowGenerator, Texture, HDRCubeTexture
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import { WorldSnapshot } from '@ra4/shared-types';
import { RTSCamera } from './camera.js';
import { useUIStore } from '@ra4/ui';
import { RuntimeAssetInstance, RuntimeAssetRegistry } from './assets/RuntimeAssetRegistry.js';
import { GameplayAssetPresenter } from './presentation/GameplayAssetPresenter.js';
import { findNearestShooter, getGameplayAssetProfile } from './presentation/gameplayAssetPolicy.js';

export class RTSRenderer {
  public engine: Engine;
  public scene: Scene;
  public rtsCamera: RTSCamera;
  public entityMeshes: Map<number, TransformNode> = new Map();
  public selectionRings: Map<number, Mesh> = new Map();
  public shadowGenerator: ShadowGenerator | null = null;
  public pipeline: DefaultRenderingPipeline | null = null;
  public ready: Promise<void>;

  private materials: Map<string, StandardMaterial | PBRMaterial> = new Map();
  private entityPresenters: Map<number, GameplayAssetPresenter> = new Map();
  private environmentAssets: RuntimeAssetInstance[] = [];
  private assetRegistry: RuntimeAssetRegistry;
  private previousHp: Map<number, number> = new Map();

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
    this.assetRegistry = new RuntimeAssetRegistry(this.scene, this.shadowGenerator);

    // AAA Post-Processing Pipeline
    this.initPostProcessing();
    this.initMaterials();
    this.createTacticalTerrain();
    this.ready = this.initializeAssets();

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

    const pbrGround = new PBRMaterial('pbrGround', this.scene);
    pbrGround.albedoTexture = this.createTerrainTexture('/assets/textures/terrain/brown_mud_02_diff_1k.jpg', 14);
    pbrGround.bumpTexture = this.createTerrainTexture('/assets/textures/terrain/brown_mud_02_nor_gl_1k.jpg', 14);
    pbrGround.metallicTexture = this.createTerrainTexture('/assets/textures/terrain/brown_mud_02_arm_1k.jpg', 14);
    pbrGround.useAmbientOcclusionFromMetallicTextureRed = true;
    pbrGround.useRoughnessFromMetallicTextureGreen = true;
    pbrGround.useMetallnessFromMetallicTextureBlue = true;
    pbrGround.roughness = .92;
    pbrGround.metallic = .02;

    ground.material = pbrGround;

    const road = MeshBuilder.CreateGround('asphalt-road', { width: 12, height: 64 }, this.scene);
    road.position = new Vector3(31, .018, 32);
    road.receiveShadows = true;
    const roadMaterial = new PBRMaterial('pbrAsphalt', this.scene);
    roadMaterial.albedoTexture = this.createTerrainTexture('/assets/textures/terrain/asphalt_01_diff_1k.jpg', 8);
    roadMaterial.bumpTexture = this.createTerrainTexture('/assets/textures/terrain/asphalt_01_nor_gl_1k.jpg', 8);
    roadMaterial.roughness = .88;
    road.material = roadMaterial;

    for (const [index, position] of [[12, 12], [50, 50]].entries()) {
      const pad = MeshBuilder.CreateGround(`concrete-pad-${index}`, { width: 13, height: 13 }, this.scene);
      pad.position = new Vector3(position[0], .026, position[1]);
      pad.receiveShadows = true;
      const material = new PBRMaterial(`pbrConcrete-${index}`, this.scene);
      material.albedoTexture = this.createTerrainTexture('/assets/textures/terrain/concrete_floor_01_diff_1k.jpg', 3);
      material.bumpTexture = this.createTerrainTexture('/assets/textures/terrain/concrete_floor_01_nor_gl_1k.jpg', 3);
      material.roughness = .84;
      pad.material = material;
    }
  }

  private createTerrainTexture(url: string, scale: number): Texture {
    const texture = new Texture(url, this.scene, true, false);
    texture.uScale = scale;
    texture.vScale = scale;
    return texture;
  }

  private async initializeAssets(): Promise<void> {
    const environment = new HDRCubeTexture('/assets/environments/industrial_sunset_puresky_1k.hdr', this.scene, 128, false, true, false, true);
    this.scene.environmentTexture = environment;
    this.scene.environmentIntensity = .72;
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = .005;
    this.scene.fogColor = new Color3(.12, .15, .18);
    await this.assetRegistry.preloadCritical();
    this.spawnEnvironmentDecor();
  }

  private spawnEnvironmentDecor(): void {
    const layouts: Array<{ assetId: string; points: Array<[number, number, number]> }> = [
      { assetId: 'ENV_PineTree01', points: [[8, 9, .1], [12, 7, 1.3], [10, 16, 2.5], [52, 11, 3.2], [55, 16, 4.1], [51, 52, 5.2], [9, 53, 5.8]] },
      { assetId: 'ENV_CoastRocks01', points: [[4, 30, .4], [59, 31, 1.7], [30, 4, 3.1], [33, 59, 4.8]] },
      { assetId: 'PROP_ConcreteBarrier', points: [[24, 26, 0], [27, 26, 0], [36, 39, 3.14], [39, 39, 3.14]] },
      { assetId: 'PROP_MilitaryCrate', points: [[16, 15, .3], [17.3, 15.4, 1.1], [46, 49, 2.4]] },
    ];
    for (const layout of layouts) {
      layout.points.forEach(([x, z, rotation], index) => {
        const instance = this.assetRegistry.instantiate(layout.assetId, `${layout.assetId}_${index}`);
        if (!instance) return;
        instance.root.position.set(x, 0, z);
        instance.root.rotation.y = rotation;
        this.environmentAssets.push(instance);
      });
    }
  }

  public updateScene(snapshot: WorldSnapshot): void {
    const activeIds = new Set<number>();
    const selectedIds = new Set(useUIStore.getState().selectedEntityIds);
    const visualShots: Array<{ startX: number; startY: number; targetX: number; targetY: number }> = [...(snapshot.shotFX ?? [])];
    if (visualShots.length === 0) {
      for (const target of snapshot.entities) {
        const previousHp = this.previousHp.get(target.id);
        if (previousHp === undefined || target.hp >= previousHp) continue;
        const attacker = snapshot.entities.find((entity) => entity.targetEntityId === target.id && Boolean(getGameplayAssetProfile(entity.specId)?.muzzle));
        if (attacker) visualShots.push({ startX: attacker.position.x, startY: attacker.position.y, targetX: target.position.x, targetY: target.position.y });
      }
    }
    const shotByEntity = new Map<number, { target: Vector3 }>();
    for (const shot of visualShots) {
      const shooter = findNearestShooter(snapshot.entities, shot, 2.5);
      if (shooter) shotByEntity.set(shooter.id, { target: new Vector3(shot.targetX / 1000, 0, shot.targetY / 1000) });
    }

    for (const e of snapshot.entities) {
      activeIds.add(e.id);
      let node = this.entityMeshes.get(e.id);

      const wx = e.position.x / 1000;
      const wz = e.position.y / 1000;

      if (!node) {
        const profile = getGameplayAssetProfile(e.specId);
        const asset = profile ? this.assetRegistry.instantiate(e.specId, `entity_${e.id}`) : null;
        if (asset && profile) {
          const presenter = new GameplayAssetPresenter(this.scene, e.id, profile, asset);
          node = presenter.root;
          this.entityPresenters.set(e.id, presenter);
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

      const presenter = this.entityPresenters.get(e.id);
      const shot = shotByEntity.get(e.id);
      const targetEntity = e.targetEntityId === undefined ? undefined : snapshot.entities.find((candidate) => candidate.id === e.targetEntityId);
      const aimTarget = shot?.target ?? (targetEntity ? new Vector3(targetEntity.position.x / 1000, 0, targetEntity.position.y / 1000) : undefined);
      if (presenter) {
        presenter.update(e, { firing: Boolean(shot), shotTarget: aimTarget, productionActive: e.productionQueue.length > 0 });
      } else {
        node.position.x = wx;
        node.position.z = wz;
        node.position.y = 0;
        node.rotation.y = -e.rotation / 1000;
      }

      // Selection Ring
      let ring = this.selectionRings.get(e.id);
      if (selectedIds.has(e.id)) {
        if (!ring) {
          ring = MeshBuilder.CreateTorus(`ring_${e.id}`, { diameter: presenter?.selectionDiameter ?? (e.isBuilding ? 3.8 : 1.8), thickness: 0.12 }, this.scene);
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
    if (visualShots.length > 0) {
      for (const shot of visualShots) {
        const shooter = findNearestShooter(snapshot.entities, shot, 2.5);
        const presenter = shooter ? this.entityPresenters.get(shooter.id) : undefined;
        const start = presenter?.getMuzzleWorldPosition() ?? new Vector3(shot.startX / 1000, 1.2, shot.startY / 1000);
        const line = MeshBuilder.CreateLines(`tracer_${Date.now()}_${Math.random()}`, {
          points: [
            start,
            new Vector3(shot.targetX / 1000, 1.2, shot.targetY / 1000)
          ]
        }, this.scene);
        line.color = new Color3(1.0, 0.85, 0.25);

        const flash = new PointLight(`flash_${Date.now()}`, start, this.scene);
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
        const presenter = this.entityPresenters.get(id);
        if (presenter) presenter.dispose();
        else node.dispose();
        this.entityMeshes.delete(id);
        this.entityPresenters.delete(id);
        const ring = this.selectionRings.get(id);
        if (ring) {
          ring.dispose();
          this.selectionRings.delete(id);
        }
      }
    }
    this.previousHp = new Map(snapshot.entities.map((entity) => [entity.id, entity.hp]));
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
    for (const presenter of this.entityPresenters.values()) presenter.dispose();
    this.entityPresenters.clear();
    this.previousHp.clear();
    this.entityMeshes.clear();
    for (const asset of this.environmentAssets) asset.dispose();
    this.environmentAssets = [];
    this.assetRegistry.dispose();

    if (this.pipeline) {
      this.pipeline.dispose();
    }
    this.rtsCamera.dispose();
    this.engine.dispose();
  }
}
