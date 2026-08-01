import { AnimationGroup, Color3, Matrix, Mesh, MeshBuilder, Node, PBRMaterial, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import { EntityStateSnapshot } from '@ra4/shared-types';
import { RuntimeAssetInstance } from '../assets/RuntimeAssetRegistry.js';
import { GameplayAssetProfile, normalizeCargo, resolveAnimation } from './gameplayAssetPolicy.js';

export interface PresentationUpdate {
  firing: boolean;
  shotTarget?: Vector3;
  productionActive: boolean;
}

function socketPosition(socket: Node | undefined): Vector3 | undefined {
  return socket?.getWorldMatrix().getTranslation();
}

export class GameplayAssetPresenter {
  public readonly root: TransformNode;
  public readonly selectionDiameter: number;

  private activeAnimation: AnimationGroup | undefined;
  private activeAnimationName: string | undefined;
  private oreFill: Mesh | undefined;
  private unloadPulse: Mesh | undefined;
  private factoryBayLight: Mesh | undefined;
  private previousOre: number | undefined;
  private unloadPulseUntil = 0;

  public constructor(
    private readonly scene: Scene,
    public readonly entityId: number,
    public readonly profile: GameplayAssetProfile,
    private readonly instance: RuntimeAssetInstance,
  ) {
    this.root = instance.root;
    this.selectionDiameter = profile.selectionDiameter;
    this.root.scaling.setAll(profile.scale);
    this.root.metadata = { ...(this.root.metadata ?? {}), entityId, specId: profile.id };
    for (const child of this.root.getDescendants(false)) {
      child.metadata = { ...(child.metadata ?? {}), entityId, specId: profile.id };
    }
    for (const mesh of instance.visibleMeshes) {
      this.normalizeMaterialGlow(mesh);
    }
    this.createCargoFeedback();
    this.createFactoryFeedback();
  }

  private normalizeMaterialGlow(mesh: Mesh): void {
    const material = mesh.material;
    if (!(material instanceof PBRMaterial || material instanceof StandardMaterial)) return;
    const brightestChannel = Math.max(material.emissiveColor.r, material.emissiveColor.g, material.emissiveColor.b);
    if (brightestChannel <= .2) return;
    material.emissiveColor.scaleInPlace(.2 / brightestChannel);
  }

  public update(entity: EntityStateSnapshot, update: PresentationUpdate): void {
    this.root.position.set(entity.position.x / 1000, this.profile.groundOffset, entity.position.y / 1000);
    this.root.rotation.y = this.profile.rotationOffset - entity.rotation;
    this.updateAnimation(Boolean(entity.moveTarget), update.firing);
    if (update.shotTarget) this.aimTurret(update.shotTarget);
    this.updateCargo(entity);
    if (this.factoryBayLight) this.factoryBayLight.isVisible = update.productionActive;
  }

  public getMuzzleWorldPosition(): Vector3 {
    const socket = this.profile.muzzle ? this.instance.sockets.get(this.profile.muzzle) : undefined;
    this.root.computeWorldMatrix(true);
    socket?.computeWorldMatrix(true);
    return socketPosition(socket) ?? Vector3.TransformCoordinates(Vector3.FromArray(this.profile.fallbackMuzzleOffset), this.root.getWorldMatrix());
  }

  private updateAnimation(moving: boolean, firing: boolean): void {
    const name = resolveAnimation(this.profile, moving, firing, new Set(this.instance.animations.keys()));
    if (name === this.activeAnimationName) return;
    this.activeAnimation?.stop();
    this.activeAnimation = name ? this.instance.animations.get(name) : undefined;
    this.activeAnimationName = name;
    this.activeAnimation?.start(!firing, 1);
  }

  private aimTurret(worldTarget: Vector3): void {
    const turretNode = this.profile.turretYaw ? this.instance.sockets.get(this.profile.turretYaw) : undefined;
    if (!(turretNode instanceof TransformNode)) return;
    const parentMatrix = turretNode.parent?.getWorldMatrix() ?? Matrix.Identity();
    const localTarget = Vector3.TransformCoordinates(worldTarget, Matrix.Invert(parentMatrix));
    const direction = localTarget.subtract(turretNode.position);
    turretNode.rotation.y = Math.atan2(direction.x, direction.z);
  }

  private createCargoFeedback(): void {
    if (!this.profile.oreFillAnchor) return;
    const anchor = this.instance.sockets.get(this.profile.oreFillAnchor);
    if (!anchor) return;
    const material = new StandardMaterial(`ore-fill-material-${this.entityId}`, this.scene);
    material.diffuseColor = new Color3(.95, .55, .08);
    material.emissiveColor = new Color3(.35, .12, .01);
    this.oreFill = MeshBuilder.CreateBox(`ore-fill-${this.entityId}`, { width: 1.7, height: .5, depth: 1.2 }, this.scene);
    this.oreFill.material = material;
    this.oreFill.parent = anchor;
    this.oreFill.isPickable = false;
    this.oreFill.isVisible = false;

    const unloadAnchor = this.profile.unloadSocket ? this.instance.sockets.get(this.profile.unloadSocket) : undefined;
    if (!unloadAnchor) return;
    const pulseMaterial = new StandardMaterial(`ore-unload-material-${this.entityId}`, this.scene);
    pulseMaterial.diffuseColor = new Color3(1, .68, .12);
    pulseMaterial.emissiveColor = new Color3(.8, .32, .02);
    pulseMaterial.alpha = .7;
    this.unloadPulse = MeshBuilder.CreateSphere(`ore-unload-${this.entityId}`, { diameter: .55, segments: 8 }, this.scene);
    this.unloadPulse.material = pulseMaterial;
    this.unloadPulse.parent = unloadAnchor;
    this.unloadPulse.isPickable = false;
    this.unloadPulse.isVisible = false;
  }

  private updateCargo(entity: EntityStateSnapshot): void {
    if (!this.oreFill) return;
    const fill = normalizeCargo(entity.currentOre, entity.maxOre);
    this.oreFill.isVisible = fill > 0;
    this.oreFill.scaling.y = Math.max(.04, fill);
    this.oreFill.position.y = .25 * fill;
    if (this.previousOre !== undefined && entity.currentOre < this.previousOre && !entity.moveTarget) this.unloadPulseUntil = performance.now() + 450;
    this.previousOre = entity.currentOre;
    if (this.unloadPulse) {
      const remaining = this.unloadPulseUntil - performance.now();
      this.unloadPulse.isVisible = remaining > 0;
      this.unloadPulse.scaling.setAll(remaining > 0 ? 1 + (450 - remaining) / 300 : 1);
    }
  }

  private createFactoryFeedback(): void {
    if (!this.profile.exitPoint) return;
    const anchor = this.instance.sockets.get(this.profile.exitPoint);
    if (!anchor) return;
    const material = new StandardMaterial(`factory-bay-material-${this.entityId}`, this.scene);
    material.diffuseColor = new Color3(.08, .35, .32);
    material.emissiveColor = new Color3(.04, .9, .7);
    material.alpha = .72;
    this.factoryBayLight = MeshBuilder.CreateBox(`factory-bay-light-${this.entityId}`, { width: 2.4, height: .08, depth: 1.2 }, this.scene);
    this.factoryBayLight.material = material;
    this.factoryBayLight.parent = anchor;
    this.factoryBayLight.isPickable = false;
    this.factoryBayLight.isVisible = false;
  }

  public dispose(): void {
    this.activeAnimation?.stop();
    this.oreFill?.dispose(false, true);
    this.unloadPulse?.dispose(false, true);
    this.factoryBayLight?.dispose(false, true);
    this.instance.dispose();
  }
}
