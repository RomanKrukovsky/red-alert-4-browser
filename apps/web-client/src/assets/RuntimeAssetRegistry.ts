import { AnimationGroup, AssetContainer, Mesh, Node, Scene, SceneLoader, ShadowGenerator, TransformNode } from '@babylonjs/core';
import { RuntimeAssetDefinition, runtimeAssetById, runtimeAssetManifest } from './runtimeAssetManifest.js';

export interface RuntimeAssetInstance {
  root: TransformNode;
  visibleMeshes: Mesh[];
  animations: Map<string, AnimationGroup>;
  sockets: Map<string, Node>;
  dispose: () => void;
}

interface LoadedAsset {
  definition: RuntimeAssetDefinition;
  containers: AssetContainer[];
}

const collectMeshes = (nodes: Node[]): Mesh[] => {
  const meshes: Mesh[] = [];
  for (const node of nodes) {
    if (node instanceof Mesh) meshes.push(node);
    if (node instanceof TransformNode) {
      for (const m of node.getChildMeshes(false)) {
        if (m instanceof Mesh) meshes.push(m);
      }
    }
  }
  return Array.from(new Set(meshes));
};

export class RuntimeAssetRegistry {
  private loaded = new Map<string, LoadedAsset>();
  private loading = new Set<string>();

  public constructor(private scene: Scene, private shadowGenerator: ShadowGenerator | null) {}

  public async preloadCritical(priorityIds?: string[]): Promise<void> {
    // Fire off all background loads first (non-blocking)
    for (const definition of runtimeAssetManifest) {
      this.ensureLoaded(definition.id);
    }
    // Then await the priority assets so they're ready before the match begins
    if (priorityIds && priorityIds.length > 0) {
      const loads = priorityIds.map((id) => {
        const def = runtimeAssetById.get(id);
        if (!def) return Promise.resolve();
        return this.load(def).catch(() => {});
      });
      await Promise.all(loads);
    }
  }

  public ensureLoaded(assetId: string): void {
    const definition = runtimeAssetById.get(assetId);
    if (!definition || this.loaded.has(assetId) || this.loading.has(assetId)) return;
    void this.load(definition).catch((error: unknown) => {
      console.warn(`[RuntimeAssetRegistry] Failed to load ${assetId}; fallback will be used.`, error);
    });
  }

  private async load(definition: RuntimeAssetDefinition): Promise<void> {
    if (this.loaded.has(definition.id) || this.loading.has(definition.id)) return;
    this.loading.add(definition.id);
    try {
      const urls = [definition.url, ...definition.lods.map((lod) => lod.url)];
      const containers = await Promise.all(urls.map((url) => SceneLoader.LoadAssetContainerAsync('', url, this.scene)));
      this.loaded.set(definition.id, { definition, containers });
    } finally {
      this.loading.delete(definition.id);
    }
  }

  public instantiate(assetId: string, instanceName: string): RuntimeAssetInstance | null {
    const loaded = this.loaded.get(assetId);
    if (!loaded) return null;
    const root = new TransformNode(instanceName, this.scene);
    const instantiated = loaded.containers.map((container, lodIndex) => container.instantiateModelsToScene((name) => `${instanceName}_${lodIndex}_${name}`, false));
    for (const entry of instantiated) for (const node of entry.rootNodes) node.parent = root;

    const collisionMeshes = instantiated.flatMap((entry) => collectMeshes(entry.rootNodes)).filter((mesh) => mesh.name.includes('CollisionRoot'));
    for (const mesh of collisionMeshes) {
      mesh.isPickable = true;
      mesh.isVisible = false;
    }
    const baseMeshes = collectMeshes(instantiated[0].rootNodes).filter((mesh) => !mesh.name.includes('CollisionRoot'));
    for (let lodIndex = 1; lodIndex < instantiated.length; lodIndex += 1) {
      const lodMeshes = collectMeshes(instantiated[lodIndex].rootNodes).filter((mesh) => !mesh.name.includes('CollisionRoot'));
      const distance = loaded.definition.lods[lodIndex - 1]?.distance ?? 30 + lodIndex * 20;
      for (let meshIndex = 0; meshIndex < Math.min(baseMeshes.length, lodMeshes.length); meshIndex += 1) {
        const lodMesh = lodMeshes[meshIndex];
        lodMesh.isPickable = false;
        baseMeshes[meshIndex].addLODLevel(distance, lodMesh);
      }
    }

    for (const mesh of baseMeshes) {
      mesh.isPickable = true;
      mesh.receiveShadows = loaded.definition.receiveShadows;
      if (loaded.definition.castShadows) this.shadowGenerator?.addShadowCaster(mesh, true);
    }

    const animations = new Map<string, AnimationGroup>();
    for (const group of instantiated[0].animationGroups) animations.set(group.name.replace(`${instanceName}_0_`, ''), group);
    const sockets = new Map<string, Node>();
    for (const socketName of Object.values(loaded.definition.sockets ?? {})) {
      const node = root.getDescendants(false).find((child) => child.name.endsWith(socketName));
      if (node) sockets.set(socketName, node);
    }

    return {
      root,
      visibleMeshes: baseMeshes,
      animations,
      sockets,
      dispose: () => {
        for (const entry of instantiated) entry.dispose();
        root.dispose(false, true);
      },
    };
  }

  public has(assetId: string): boolean {
    return this.loaded.has(assetId) && runtimeAssetById.has(assetId);
  }

  public dispose(): void {
    for (const loaded of this.loaded.values()) for (const container of loaded.containers) container.dispose();
    this.loaded.clear();
    this.loading.clear();
  }
}
