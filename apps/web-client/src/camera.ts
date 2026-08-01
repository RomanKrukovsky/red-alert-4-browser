import { ArcRotateCamera, Scene, Vector3 } from '@babylonjs/core';

/**
 * Pure helper: computes the XZ move delta for one frame given the current key state.
 *
 * The camera sits at alpha = -PI/4, which means it is offset in the +X / -Z quadrant.
 * Screen-right therefore corresponds to world (-X, -Z) and screen-left to (+X, +Z).
 * Consequently, A (left) must increase world X and D (right) must decrease it.
 */
export function computeMoveDelta(
  keysPressed: Set<string>,
  baseSpeed: number
): { x: number; z: number } {
  const speed = keysPressed.has('shift') ? baseSpeed * 2.0 : baseSpeed;
  let x = 0;
  let z = 0;

  if (keysPressed.has('w') || keysPressed.has('arrowup') || keysPressed.has('edge_up'))     z += speed;
  if (keysPressed.has('s') || keysPressed.has('arrowdown') || keysPressed.has('edge_down'))  z -= speed;
  if (keysPressed.has('a') || keysPressed.has('arrowleft') || keysPressed.has('edge_left'))  x += speed; // +X = screen-left at alpha=-PI/4
  if (keysPressed.has('d') || keysPressed.has('arrowright') || keysPressed.has('edge_right')) x -= speed; // -X = screen-right at alpha=-PI/4

  return { x, z };
}

export class RTSCamera {
  public camera: ArcRotateCamera;
  private moveSpeed: number = 0.8;
  private keysPressed: Set<string> = new Set();
  private isEdgePanEnabled: boolean = true;
  private mapMinX: number = 0;
  private mapMaxX: number = 64;
  private mapMinZ: number = 0;
  private mapMaxZ: number = 64;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.camera = new ArcRotateCamera(
      'rtsCamera',
      -Math.PI / 4,
      Math.PI / 3.2,
      40,
      new Vector3(32, 0, 32),
      scene
    );

    this.camera.lowerRadiusLimit = 12;
    this.camera.upperRadiusLimit = 75;
    this.camera.lowerBetaLimit = 0.3;
    this.camera.upperBetaLimit = Math.PI / 2.5;

    // Key listeners for WASD
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });

    // Disable default browser context menu on canvas
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keysPressed.add(e.key.toLowerCase());
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysPressed.delete(e.key.toLowerCase());
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isEdgePanEnabled) return;
    const margin = 15;
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (e.clientX < margin) this.keysPressed.add('edge_left');
    else this.keysPressed.delete('edge_left');

    if (e.clientX > w - margin) this.keysPressed.add('edge_right');
    else this.keysPressed.delete('edge_right');

    if (e.clientY < margin) this.keysPressed.add('edge_up');
    else this.keysPressed.delete('edge_up');

    if (e.clientY > h - margin) this.keysPressed.add('edge_down');
    else this.keysPressed.delete('edge_down');
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.camera.radius = Math.max(this.camera.lowerRadiusLimit ?? 12, Math.min(this.camera.upperRadiusLimit ?? 75, this.camera.radius + e.deltaY * .035));
  };

  public setFreeCameraMode(enabled: boolean): void {
    if (enabled) {
      this.camera.lowerBetaLimit = 0.1;
      this.camera.upperBetaLimit = Math.PI / 2.05;
      this.camera.lowerRadiusLimit = 5;
      this.camera.upperRadiusLimit = 120;
    } else {
      this.camera.lowerRadiusLimit = 12;
      this.camera.upperRadiusLimit = 75;
      this.camera.lowerBetaLimit = 0.3;
      this.camera.upperBetaLimit = Math.PI / 2.5;
    }
  }

  public rotateFree(deltaX: number, deltaY: number, sensitivity: number = 0.005): void {
    this.camera.alpha += deltaX * sensitivity;
    this.camera.beta = Math.max(0.1, Math.min(Math.PI / 2.05, this.camera.beta + deltaY * sensitivity));
  }

  public trackUnitPosition(pos: { x: number; y: number }, smooth: boolean = true): void {
    const worldX = pos.x / 1000;
    const worldZ = pos.y / 1000;

    if (smooth) {
      this.camera.target.x += (worldX - this.camera.target.x) * 0.15;
      this.camera.target.z += (worldZ - this.camera.target.z) * 0.15;
    } else {
      this.camera.target.x = worldX;
      this.camera.target.z = worldZ;
    }

    this.camera.radius = 16;
    this.camera.beta = Math.PI / 2.8;
  }

  public update(): void {
    const { x, z } = computeMoveDelta(this.keysPressed, this.moveSpeed);
    if (x !== 0 || z !== 0) {
      this.camera.target.x = Math.max(this.mapMinX, Math.min(this.mapMaxX, this.camera.target.x + x));
      this.camera.target.z = Math.max(this.mapMinZ, Math.min(this.mapMaxZ, this.camera.target.z + z));
    }
  }

  public focusOnPosition(x: number, z: number): void {
    this.camera.target.x = Math.max(this.mapMinX, Math.min(this.mapMaxX, x));
    this.camera.target.z = Math.max(this.mapMinZ, Math.min(this.mapMaxZ, z));
  }

  public pan(deltaX: number, deltaZ: number): void {
    this.camera.target.x = Math.max(this.mapMinX, Math.min(this.mapMaxX, this.camera.target.x + deltaX));
    this.camera.target.z = Math.max(this.mapMinZ, Math.min(this.mapMaxZ, this.camera.target.z + deltaZ));
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    this.camera.getScene().getEngine().getRenderingCanvas()?.removeEventListener('wheel', this.handleWheel);
  }
}
