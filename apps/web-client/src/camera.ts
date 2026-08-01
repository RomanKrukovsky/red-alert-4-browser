import { ArcRotateCamera, Scene, Vector3 } from '@babylonjs/core';

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

    // Attach wheel zoom
    this.camera.inputs.addMouseWheel();

    // Key listeners for WASD
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);

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
    const move = new Vector3(0, 0, 0);
    const speed = this.keysPressed.has('shift') ? this.moveSpeed * 2.0 : this.moveSpeed;

    if (this.keysPressed.has('w') || this.keysPressed.has('arrowup') || this.keysPressed.has('edge_up')) {
      move.z += speed;
    }
    if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown') || this.keysPressed.has('edge_down')) {
      move.z -= speed;
    }
    if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft') || this.keysPressed.has('edge_left')) {
      move.x -= speed;
    }
    if (this.keysPressed.has('d') || this.keysPressed.has('arrowright') || this.keysPressed.has('edge_right')) {
      move.x += speed;
    }

    if (move.lengthSquared() > 0) {
      this.camera.target.x = Math.max(this.mapMinX, Math.min(this.mapMaxX, this.camera.target.x + move.x));
      this.camera.target.z = Math.max(this.mapMinZ, Math.min(this.mapMaxZ, this.camera.target.z + move.z));
    }
  }

  public focusOnPosition(x: number, z: number): void {
    this.camera.target.x = Math.max(this.mapMinX, Math.min(this.mapMaxX, x));
    this.camera.target.z = Math.max(this.mapMinZ, Math.min(this.mapMaxZ, z));
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
  }
}
