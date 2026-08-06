import {
  Engine, Scene, Vector3, Matrix, HemisphericLight, DirectionalLight, PointLight,
  MeshBuilder, StandardMaterial, PBRMaterial, Color3, Color4, Mesh, TransformNode,
  DefaultRenderingPipeline, ShadowGenerator, Texture, HDRCubeTexture
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF/index.js';
import { WorldSnapshot } from '@ra4/shared-types';
import { DEFAULT_DATABASE } from '@ra4/content-runtime';
import { RTSCamera } from './camera.js';
import { useUIStore } from '@ra4/ui';
import { RuntimeAssetInstance, RuntimeAssetRegistry } from './assets/RuntimeAssetRegistry.js';
import { GameplayAssetPresenter } from './presentation/GameplayAssetPresenter.js';
import { findNearestShooter, getGameplayAssetProfile } from './presentation/gameplayAssetPolicy.js';

export class RTSRenderer {
  public engine: Engine;
  public scene: Scene;
  public rtsCamera: RTSCamera;
  /** The map this renderer is presenting, selected by content id. */
  public readonly map: typeof DEFAULT_DATABASE.maps[number];
  /** Map size in grid tiles (world units), sourced from content data. */
  public readonly mapSize: number;
  public entityMeshes: Map<number, TransformNode> = new Map();
  public selectionRings: Map<number, Mesh> = new Map();
  public healthBars: Map<number, { bg: Mesh, fill: Mesh }> = new Map();
  public moveIndicator: Mesh | null = null;
  private moveIndicatorAlphaDir: number = 1;
  public shadowGenerator: ShadowGenerator | null = null;
  public pipeline: DefaultRenderingPipeline | null = null;
  public ready: Promise<void>;

  private materials: Map<string, StandardMaterial | PBRMaterial> = new Map();
  private entityPresenters: Map<number, GameplayAssetPresenter> = new Map();
  private environmentAssets: RuntimeAssetInstance[] = [];
  private tacticalMeshes: Mesh[] = [];
  private assetRegistry: RuntimeAssetRegistry;
  private previousHp: Map<number, number> = new Map();

  constructor(canvas: HTMLCanvasElement, mapId?: string) {
    this.map = (mapId ? DEFAULT_DATABASE.maps.find((m) => m.id === mapId) : undefined) ?? DEFAULT_DATABASE.maps[0];
    this.mapSize = this.map.width;
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(.045, .05, .062, 1);

    // RTS Camera
    this.rtsCamera = new RTSCamera(this.scene, canvas);

    // Dynamic Directional Sunlight with Cascaded Soft Shadows
    const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemiLight.intensity = .85;
    hemiLight.diffuse = new Color3(.92, .9, .98);
    hemiLight.groundColor = new Color3(.28, .24, .3);

    const dirLight = new DirectionalLight('dir', new Vector3(-1.2, -2.5, -1.0), this.scene);
    dirLight.position = new Vector3(50, 90, 50);
    dirLight.intensity = 1.7;
    dirLight.diffuse = new Color3(1.0, .96, .88);

    this.shadowGenerator = new ShadowGenerator(2048, dirLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 24;
    this.assetRegistry = new RuntimeAssetRegistry(this.scene, this.shadowGenerator);

    // AAA Post-Processing Pipeline
    this.initPostProcessing();
    this.initMaterials();
    this.createTacticalTerrain();
    this.ready = this.initializeAssets();

    // Main Render & Animation Loop
    this.engine.runRenderLoop(() => {
      this.rtsCamera.update();
      
      // Camera bounds and elevation clamping
      this.camera.target.x = Math.max(0, Math.min(this.mapSize, this.camera.target.x));
      this.camera.target.z = Math.max(0, Math.min(this.mapSize, this.camera.target.z));
      if (this.camera.position.y < 5) {
        this.camera.setPosition(new Vector3(this.camera.position.x, 5, this.camera.position.z));
      }

      // Rotate selection rings
      for (const ring of this.selectionRings.values()) {
        if (ring.isVisible) {
          ring.rotation.y += 0.02;
        }
      }

      // Pulsate move indicator
      if (this.moveIndicator && this.moveIndicator.isVisible) {
        const mat = this.moveIndicator.material as StandardMaterial;
        if (mat) {
          mat.alpha += 0.02 * this.moveIndicatorAlphaDir;
          if (mat.alpha >= 0.8) this.moveIndicatorAlphaDir = -1;
          else if (mat.alpha <= 0.3) this.moveIndicatorAlphaDir = 1;
        }
      }

      this.scene.render();
    });

    this.onResize = () => {
      this.engine.resize();
    };
    window.addEventListener('resize', this.onResize);
  }

  private onResize: () => void;

  get camera() {
    return this.rtsCamera.camera;
  }

  private initPostProcessing(): void {
    try {
      this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
      this.scene.imageProcessingConfiguration.exposure = 1.12;
      this.scene.imageProcessingConfiguration.contrast = 1.12;
      this.pipeline = new DefaultRenderingPipeline('ra4Pipeline', true, this.scene, [this.camera]);
      this.pipeline.bloomEnabled = true;
      this.pipeline.bloomThreshold = .94;
      this.pipeline.bloomWeight = .08;
      this.pipeline.bloomKernel = 24;
      this.pipeline.fxaaEnabled = true;
      this.pipeline.chromaticAberrationEnabled = false;
      this.pipeline.imageProcessingEnabled = true;
      this.pipeline.imageProcessing.toneMappingEnabled = true;
      this.pipeline.imageProcessing.vignetteEnabled = true;
      this.pipeline.imageProcessing.exposure = 1.12;
      this.pipeline.imageProcessing.contrast = 1.12;
      this.pipeline.imageProcessing.vignetteWeight = .3;
      this.pipeline.imageProcessing.vignetteColor = new Color4(0.02, 0.01, 0.04, 0.8);
    } catch (e) {
      console.warn('[RTSRenderer] Post-processing pipeline initialization warning:', e);
    }
  }

  private initMaterials(): void {
    const createStdMat = (name: string, color: Color3, glow: Color3) => {
      const mat = new StandardMaterial(name, this.scene);
      mat.diffuseColor = color;
      mat.specularColor = new Color3(0.6, 0.6, 0.6);
      mat.emissiveColor = glow;
      this.materials.set(name, mat);
    };

    createStdMat('mat_SU', new Color3(0.68, 0.12, 0.1), new Color3(0.035, 0.006, 0.005));
    createStdMat('mat_AL', new Color3(0.12, 0.4, 0.72), new Color3(0.005, 0.014, 0.035));
    createStdMat('mat_CO', new Color3(0.75, 0.55, 0.1), new Color3(0.04, 0.028, 0.005));
    createStdMat('mat_CH', new Color3(0.65, 0.15, 0.9), new Color3(0.2, 0.05, 0.35));

    const ringMat = new StandardMaterial('mat_ring', this.scene);
    ringMat.diffuseColor = new Color3(0.6, 0.15, 1.0);
    ringMat.emissiveColor = new Color3(0.8, 0.2, 1.0);
    this.materials.set('mat_ring', ringMat);

    const validMat = new StandardMaterial('mat_ghost_valid', this.scene);
    validMat.diffuseColor = new Color3(0.6, 0.1, 1.0);
    validMat.emissiveColor = new Color3(0.7, 0.2, 1.0);
    validMat.alpha = 0.65;
    this.materials.set('mat_ghost_valid', validMat);

    const invalidMat = new StandardMaterial('mat_ghost_invalid', this.scene);
    invalidMat.diffuseColor = new Color3(1, 0.1, 0.1);
    invalidMat.alpha = 0.65;
    this.materials.set('mat_ghost_invalid', invalidMat);
  }

  private createTacticalTerrain(): void {
    const M = this.mapSize;          // map size in world units (tiles)
    const C = M / 2;                 // map center
    const terrainSkirt = MeshBuilder.CreateGround('terrain-skirt', { width: M * 2.8, height: M * 2.8, subdivisions: 32 }, this.scene);
    terrainSkirt.position = new Vector3(C, -.04, C);
    terrainSkirt.receiveShadows = true;
    const terrainSkirtMaterial = new StandardMaterial('terrain-skirt-material', this.scene);
    // Diffuse tint multiplies the texture — keep it near-white so the mud reads.
    terrainSkirtMaterial.diffuseColor = new Color3(.5, .46, .44);
    terrainSkirtMaterial.ambientColor = new Color3(.2, .18, .18);
    terrainSkirtMaterial.diffuseTexture = this.createTerrainTexture('/assets/textures/terrain/brown_mud_02_diff_1k.jpg', 28);
    terrainSkirtMaterial.bumpTexture = this.createTerrainTexture('/assets/textures/terrain/brown_mud_02_nor_gl_1k.jpg', 28);
    terrainSkirtMaterial.specularColor = new Color3(.06, .05, .08);
    terrainSkirt.material = terrainSkirtMaterial;
    this.tacticalMeshes.push(terrainSkirt);

    const ground = MeshBuilder.CreateGround('ground', { width: M, height: M, subdivisions: 64 }, this.scene);
    ground.position = new Vector3(C, 0, C);
    ground.receiveShadows = true;

    const groundMaterial = new StandardMaterial('ground-material', this.scene);
    // Near-white multiplier: let the mud diffuse texture carry the color.
    groundMaterial.diffuseColor = new Color3(.85, .8, .74);
    groundMaterial.ambientColor = new Color3(.3, .28, .26);
    groundMaterial.diffuseTexture = this.createTerrainTexture('/assets/textures/terrain/brown_mud_02_diff_1k.jpg', 14);
    groundMaterial.bumpTexture = this.createTerrainTexture('/assets/textures/terrain/brown_mud_02_nor_gl_1k.jpg', 14);
    groundMaterial.specularColor = new Color3(.1, .09, .08);
    ground.material = groundMaterial;

    const road = MeshBuilder.CreateGround('asphalt-road', { width: 10, height: M }, this.scene);
    road.position = new Vector3(C - 1, .018, C);
    road.receiveShadows = true;
    const roadMaterial = new StandardMaterial('road-material', this.scene);
    roadMaterial.diffuseColor = new Color3(.62, .62, .66);
    roadMaterial.diffuseTexture = this.createTerrainTexture('/assets/textures/terrain/asphalt_01_diff_1k.jpg', 8);
    roadMaterial.bumpTexture = this.createTerrainTexture('/assets/textures/terrain/asphalt_01_nor_gl_1k.jpg', 8);
    roadMaterial.specularColor = new Color3(.08, .08, .12);
    road.material = roadMaterial;

    const crossRoad = MeshBuilder.CreateGround('asphalt-cross-road', { width: M, height: 10 }, this.scene);
    crossRoad.position = new Vector3(C, .02, C - 1);
    crossRoad.receiveShadows = true;
    crossRoad.material = roadMaterial;
    this.tacticalMeshes.push(crossRoad);

    // Worn yellow road markings (was neon purple — visually alien to a war zone).
    const laneMaterial = new StandardMaterial('lane-marking-material', this.scene);
    laneMaterial.diffuseColor = new Color3(.75, .68, .38);
    laneMaterial.emissiveColor = new Color3(.12, .1, .04);
    const laneCount = Math.floor(M / 5.7) - 1;
    for (let index = 0; index < laneCount; index += 1) {
      const verticalMark = MeshBuilder.CreateBox(`vertical-lane-mark-${index}`, { width: .14, height: .025, depth: 2.6 }, this.scene);
      verticalMark.position.set(C - 1, .055, 3.5 + index * 5.7);
      verticalMark.material = laneMaterial;
      verticalMark.isPickable = false;
      this.tacticalMeshes.push(verticalMark);

      const horizontalMark = MeshBuilder.CreateBox(`horizontal-lane-mark-${index}`, { width: 2.6, height: .025, depth: .14 }, this.scene);
      horizontalMark.position.set(3.5 + index * 5.7, .057, C - 1);
      horizontalMark.material = laneMaterial;
      horizontalMark.isPickable = false;
      this.tacticalMeshes.push(horizontalMark);
    }

    for (const [index, position] of this.map.spawnPoints.map((sp) => [sp.x, sp.y] as [number, number]).entries()) {
      const pad = MeshBuilder.CreateGround(`concrete-pad-${index}`, { width: 22, height: 22 }, this.scene);
      pad.position = new Vector3(position[0], .026, position[1]);
      pad.receiveShadows = true;
      const material = new StandardMaterial(`concrete-material-${index}`, this.scene);
      material.diffuseColor = new Color3(.72, .7, .68);
      material.diffuseTexture = this.createTerrainTexture('/assets/textures/terrain/concrete_floor_01_diff_1k.jpg', 3);
      material.bumpTexture = this.createTerrainTexture('/assets/textures/terrain/concrete_floor_01_nor_gl_1k.jpg', 3);
      material.specularColor = new Color3(.12, .12, .14);
      pad.material = material;
      this.tacticalMeshes.push(pad);
    }

    const water = MeshBuilder.CreateGround('central-river', { width: M, height: 3.2 }, this.scene);
    water.position = new Vector3(C, .035, C);
    const waterMaterial = new StandardMaterial('central-river-material', this.scene);
    waterMaterial.diffuseColor = new Color3(.09, .16, .2);
    waterMaterial.emissiveColor = new Color3(.015, .04, .055);
    waterMaterial.specularColor = new Color3(.5, .55, .6);
    waterMaterial.specularPower = 96;
    waterMaterial.alpha = .92;
    water.material = waterMaterial;
    this.tacticalMeshes.push(water);

    const bridgeMaterial = new PBRMaterial('bridge-material', this.scene);
    bridgeMaterial.albedoColor = new Color3(.22, .24, .24);
    bridgeMaterial.metallic = .7;
    bridgeMaterial.roughness = .62;
    for (const [index, x] of [Math.round(M * 0.22), Math.round(M * 0.78)].entries()) {
      const bridge = MeshBuilder.CreateBox(`river-bridge-${index}`, { width: 7, height: .16, depth: 9 }, this.scene);
      bridge.position = new Vector3(x, .14, C);
      bridge.material = bridgeMaterial;
      bridge.receiveShadows = true;
      this.tacticalMeshes.push(bridge);
    }

    const oreMaterial = new StandardMaterial('ore-field-material', this.scene);
    oreMaterial.diffuseColor = new Color3(.55, .34, .1);
    oreMaterial.emissiveColor = new Color3(.14, .07, .012);
    oreMaterial.alpha = .8;
    const crystalMaterial = new StandardMaterial('ore-crystal-material', this.scene);
    crystalMaterial.diffuseColor = new Color3(.85, .55, .16);
    crystalMaterial.emissiveColor = new Color3(.32, .16, .03);
    for (const [index, [x, z]] of this.map.resourceNodes.map((rn) => [rn.x, rn.y] as [number, number]).entries()) {
      const isRich = this.map.resourceNodes[index]?.isRich ?? false;
      const field = MeshBuilder.CreateCylinder(`ore-field-${index}`, { diameter: isRich ? 7 : 5, height: .06, tessellation: 32 }, this.scene);
      field.position = new Vector3(x, .08, z);
      field.material = oreMaterial;
      this.tacticalMeshes.push(field);
      for (let crystalIndex = 0; crystalIndex < 4; crystalIndex += 1) {
        const crystal = MeshBuilder.CreateBox(`ore-crystal-${index}-${crystalIndex}`, { width: .28, height: .65 + crystalIndex * .1, depth: .28 }, this.scene);
        crystal.position = new Vector3(x - 1.1 + crystalIndex * .65, .43, z + (crystalIndex % 2 ? .72 : -.72));
        crystal.rotation.y = crystalIndex * .7;
        crystal.material = crystalMaterial;
        crystal.isPickable = false;
        this.tacticalMeshes.push(crystal);
      }
    }

    const boundaryMaterial = new StandardMaterial('map-boundary-material', this.scene);
    boundaryMaterial.diffuseColor = new Color3(.12, .14, .15);
    boundaryMaterial.emissiveColor = new Color3(.025, .01, .008);
    for (const [index, [x, z, width, depth]] of [[C, .2, M, .4], [C, M - .2, M, .4], [.2, C, .4, M], [M - .2, C, .4, M]].entries()) {
      const border = MeshBuilder.CreateBox(`map-boundary-${index}`, { width, height: .35, depth }, this.scene);
      border.position = new Vector3(x, .18, z);
      border.material = boundaryMaterial;
      this.tacticalMeshes.push(border);
    }
  }

  private createTerrainTexture(url: string, scale: number): Texture {
    const texture = new Texture(url, this.scene, true, false);
    texture.uScale = scale;
    texture.vScale = scale;
    return texture;
  }

  private createBuildingFallback(entityId: number, specId: string, factionId: string): TransformNode {
    const root = new TransformNode(`entity_${entityId}`, this.scene);

    // Base box — looks like a solid building placeholder
    const box = MeshBuilder.CreateBox(`entity_${entityId}_box`, { width: 3.2, height: 1.8, depth: 3.2 }, this.scene);
    box.position.y = 0.9;
    const boxMat = new StandardMaterial(`fallback_box_${entityId}`, this.scene);
    const emissive = factionId === 'CH' ? new Color3(0.3, 0.05, 0.55)
      : factionId === 'CO' ? new Color3(0.1, 0.35, 0.04)
      : factionId === 'AL' ? new Color3(0.04, 0.18, 0.45)
      : new Color3(0.45, 0.04, 0.04);
    boxMat.diffuseColor = emissive.scale(1.4);
    boxMat.emissiveColor = emissive;
    boxMat.alpha = 0.82;
    box.material = boxMat;
    box.parent = root;
    box.metadata = { entityId, specId };
    box.isPickable = true;

    // Thin base plate so it reads clearly against the terrain
    const plate = MeshBuilder.CreateBox(`entity_${entityId}_plate`, { width: 4.2, height: 0.08, depth: 4.2 }, this.scene);
    plate.position.y = 0.04;
    const plateMat = new StandardMaterial(`fallback_plate_${entityId}`, this.scene);
    plateMat.diffuseColor = emissive.scale(0.6);
    plateMat.emissiveColor = emissive.scale(0.4);
    plate.material = plateMat;
    plate.parent = root;
    plate.isPickable = false;

    return root;
  }

  private async initializeAssets(): Promise<void> {
    const environment = new HDRCubeTexture('/assets/environments/industrial_sunset_puresky_1k.hdr', this.scene, 128, false, true, false, true);
    this.scene.environmentTexture = environment;
    this.scene.environmentIntensity = .55;
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = .0028;
    this.scene.fogColor = new Color3(.1, .11, .125);
    // Preload all assets in the background; synchronously await the HQ buildings
    // and basic infantry for all four factions so the first frame already shows models.
    const criticalIds = [
      'SU_RedHQ', 'AL_CommandHQ', 'CO_DynastyHQ', 'CH_TemporalHQ',
      'SU_ConYard', 'AL_ConYard', 'CO_ConYard', 'CH_ConYard',
      'SU_ThermalPower', 'SU_PowerPlant', 'AL_PowerPlant', 'CO_PowerPlant', 'CH_PowerPlant',
      'SU_Conscript', 'SU_HammerTank', 'AL_Peacekeeper', 'AL_Guardian',
      'CO_TigerTank', 'CO_Patriot', 'CH_TimeAgentAlpha',
    ];
    await this.assetRegistry.preloadCritical(criticalIds);
    this.spawnEnvironmentDecor();
  }

  private spawnEnvironmentDecor(): void {
    const layouts: Array<{ assetId: string; points: Array<[number, number, number]> }> = [
      { assetId: 'ENV_PineTree01', points: [[2, 4, .1], [4, 2, 1.3], [15, 2, 2.5], [20, 4, 3.2], [3, 18, 4.1], [18, 20, 5.2], [24, 7, 5.8], [7, 24, 1.9], [40, 5, .4], [48, 8, 2.4], [57, 15, 3.3], [58, 45, 4.1], [46, 58, 5.4], [16, 58, .8], [4, 45, 2.9]] },
      { assetId: 'ENV_CoastRocks01', points: [[2, 27, .4], [61, 31, 1.7], [29, 2, 3.1], [34, 61, 4.8], [18, 4, 2.1], [4, 20, .9], [59, 49, 3.8]] },
      { assetId: 'PROP_ConcreteBarrier', points: [[17, 17, 0], [20, 17, 0], [17, 20, 1.57], [26, 27, 0], [29, 27, 0], [35, 38, 3.14], [38, 38, 3.14], [47, 47, 3.14]] },
      { assetId: 'PROP_MilitaryCrate', points: [[15, 14, .3], [16.3, 14.4, 1.1], [13.8, 16.2, 2.1], [47, 49, 2.4], [49, 47, .6]] },
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
        this.assetRegistry.ensureLoaded(e.specId);
        const asset = profile ? this.assetRegistry.instantiate(e.specId, `entity_${e.id}`) : null;
        if (asset && profile && asset.visibleMeshes.length > 0) {
          const presenter = new GameplayAssetPresenter(this.scene, e.id, profile, asset);
          node = presenter.root;
          this.entityPresenters.set(e.id, presenter);
        } else {
          if (asset) asset.dispose();
          if (e.isBuilding) {
            node = this.createBuildingFallback(e.id, e.specId, e.factionId);
          } else {
            node = MeshBuilder.CreateCylinder(`entity_${e.id}`, { diameter: 1.2, height: 1.0 }, this.scene);
          }
          const matName = `mat_${e.factionId}`;
          (node as Mesh).material = this.materials.get(matName) ?? this.materials.get('mat_SU')!;
        }

        this.entityMeshes.set(e.id, node);
      } else if (!this.entityPresenters.has(e.id)) {
        const profile = getGameplayAssetProfile(e.specId);
        const asset = profile ? this.assetRegistry.instantiate(e.specId, `entity_${e.id}`) : null;
        if (asset && profile && asset.visibleMeshes.length > 0) {
          node.dispose(false, true);
          const presenter = new GameplayAssetPresenter(this.scene, e.id, profile, asset);
          node = presenter.root;
          this.entityMeshes.set(e.id, node);
          this.entityPresenters.set(e.id, presenter);
        } else if (asset) {
          asset.dispose();
        }
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

      // Health Bars
      const maxHp = ('maxHp' in e && typeof e.maxHp === 'number') ? e.maxHp : 100;
      let hb = this.healthBars.get(e.id);
      if (e.hp < maxHp) {
        if (!hb) {
          const bg = MeshBuilder.CreatePlane(`hb_bg_${e.id}`, { width: 2, height: 0.15 }, this.scene);
          bg.billboardMode = Mesh.BILLBOARDMODE_ALL;
          const bgMat = new StandardMaterial(`hb_bg_mat_${e.id}`, this.scene);
          bgMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
          bgMat.emissiveColor = new Color3(0.1, 0.1, 0.1);
          bgMat.disableLighting = true;
          bg.material = bgMat;

          const fill = MeshBuilder.CreatePlane(`hb_fill_${e.id}`, { width: 2, height: 0.15 }, this.scene);
          fill.billboardMode = Mesh.BILLBOARDMODE_ALL;
          fill.position.z = -0.01;
          const fillMat = new StandardMaterial(`hb_fill_mat_${e.id}`, this.scene);
          fillMat.disableLighting = true;
          fill.material = fillMat;
          fill.parent = bg;

          hb = { bg, fill };
          this.healthBars.set(e.id, hb);
        }
        
        hb.bg.position.x = wx;
        hb.bg.position.y = 3;
        hb.bg.position.z = wz;

        const hpPct = Math.max(0, e.hp / maxHp);
        hb.fill.scaling.x = hpPct;
        hb.fill.position.x = -1 + hpPct;

        const fillMat = hb.fill.material as StandardMaterial;
        if (hpPct > 0.6) {
          fillMat.emissiveColor = new Color3(0.2, 0.8, 0.2);
          fillMat.diffuseColor = new Color3(0.2, 0.8, 0.2);
        } else if (hpPct > 0.3) {
          fillMat.emissiveColor = new Color3(0.8, 0.8, 0.2);
          fillMat.diffuseColor = new Color3(0.8, 0.8, 0.2);
        } else {
          fillMat.emissiveColor = new Color3(0.8, 0.2, 0.2);
          fillMat.diffuseColor = new Color3(0.8, 0.2, 0.2);
        }
      } else {
        if (hb) {
          hb.bg.dispose();
          hb.fill.dispose();
          this.healthBars.delete(e.id);
        }
      }
    }

    // Move target indicator
    let moveTargetPos: Vector3 | null = null;
    let moveTargetFaction: string = 'AL';
    for (const e of snapshot.entities) {
      if (selectedIds.has(e.id) && 'moveTarget' in e && e.moveTarget) {
        const target = e.moveTarget as { x: number, y: number };
        moveTargetPos = new Vector3(target.x / 1000, 0.05, target.y / 1000);
        moveTargetFaction = e.factionId;
        break;
      }
    }

    if (moveTargetPos) {
      if (!this.moveIndicator) {
        this.moveIndicator = MeshBuilder.CreateTorus('move_indicator', { diameter: 2, thickness: 0.15, tessellation: 32 }, this.scene);
        const mat = new StandardMaterial('mat_move_ind', this.scene);
        mat.alpha = 0.8;
        this.moveIndicator.material = mat;
      }
      this.moveIndicator.position = moveTargetPos;
      this.moveIndicator.isVisible = true;
      const mat = this.moveIndicator.material as StandardMaterial;
      if (moveTargetFaction === 'SU') {
        mat.emissiveColor = new Color3(0.8, 0.2, 0.2);
        mat.diffuseColor = new Color3(0.8, 0.2, 0.2);
      } else {
        mat.emissiveColor = new Color3(0.2, 0.8, 0.2);
        mat.diffuseColor = new Color3(0.2, 0.8, 0.2);
      }
    } else if (this.moveIndicator) {
      this.moveIndicator.isVisible = false;
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
        const hb = this.healthBars.get(id);
        if (hb) {
          hb.bg.dispose();
          hb.fill.dispose();
          this.healthBars.delete(id);
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
      this.ghostMesh.isPickable = false;
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

  public projectWorldToScreen(worldX: number, worldZ: number): { x: number; y: number } | null {
    if (!this.scene || !this.rtsCamera?.camera) return null;
    try {
      const worldPos = new Vector3(worldX, 0, worldZ);
      const renderWidth = this.engine.getRenderWidth();
      const renderHeight = this.engine.getRenderHeight();
      const viewport = this.rtsCamera.camera.viewport.toGlobal(renderWidth, renderHeight);
      const screenPos = Vector3.Project(
        worldPos,
        Matrix.Identity(),
        this.scene.getTransformMatrix(),
        viewport
      );
      return { x: Math.round(screenPos.x), y: Math.round(screenPos.y) };
    } catch {
      return { x: 400, y: 300 };
    }
  }

  public dispose(): void {
    if (this.ghostMesh) {
      this.ghostMesh.dispose();
    }
    if (this.moveIndicator) {
      this.moveIndicator.dispose();
      this.moveIndicator = null;
    }
    for (const hb of this.healthBars.values()) {
      hb.bg.dispose();
      hb.fill.dispose();
    }
    this.healthBars.clear();
    for (const presenter of this.entityPresenters.values()) presenter.dispose();
    this.entityPresenters.clear();
    this.previousHp.clear();
    this.entityMeshes.clear();
    for (const asset of this.environmentAssets) asset.dispose();
    this.environmentAssets = [];
    for (const mesh of this.tacticalMeshes) mesh.dispose(false, true);
    this.tacticalMeshes = [];
    this.assetRegistry.dispose();

    if (this.pipeline) {
      this.pipeline.dispose();
    }
    this.rtsCamera.dispose();
    window.removeEventListener('resize', this.onResize);
    this.engine.dispose();
  }
}
