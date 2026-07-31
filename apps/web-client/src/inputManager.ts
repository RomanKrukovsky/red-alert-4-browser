import { Scene, Vector3, Matrix, PointerEventTypes, PointerInfo } from '@babylonjs/core';
import { RTSRenderer } from './renderer.js';
import { CommandType, PlayerCommand, WorldSnapshot } from '@ra4/shared-types';
import { useUIStore } from '@ra4/ui';

export class InputManager {
  private renderer: RTSRenderer;
  private canvas: HTMLCanvasElement;
  private onCommandDispatch: (cmd: PlayerCommand) => void;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private selectionBoxElement: HTMLDivElement;

  private hotkeyGroups: Map<number, number[]> = new Map();
  private lastEventPos: Vector3 = new Vector3(32, 0, 32);

  constructor(renderer: RTSRenderer, canvas: HTMLCanvasElement, onCommandDispatch: (cmd: PlayerCommand) => void) {
    this.renderer = renderer;
    this.canvas = canvas;
    this.onCommandDispatch = onCommandDispatch;

    // Create 2D Selection Box Overlay
    this.selectionBoxElement = document.createElement('div');
    this.selectionBoxElement.style.position = 'absolute';
    this.selectionBoxElement.style.border = '1px solid #00ffc8';
    this.selectionBoxElement.style.backgroundColor = 'rgba(0, 255, 200, 0.15)';
    this.selectionBoxElement.style.pointerEvents = 'none';
    this.selectionBoxElement.style.display = 'none';
    this.selectionBoxElement.style.zIndex = '999';
    document.body.appendChild(this.selectionBoxElement);

    this.initListeners();
  }

  private initListeners(): void {
    const scene = this.renderer.scene;

    scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN: {
          if (pointerInfo.event.button === 0) { // Left Click Down
            this.isDragging = true;
            this.dragStartX = pointerInfo.event.clientX;
            this.dragStartY = pointerInfo.event.clientY;
            this.selectionBoxElement.style.left = `${this.dragStartX}px`;
            this.selectionBoxElement.style.top = `${this.dragStartY}px`;
            this.selectionBoxElement.style.width = '0px';
            this.selectionBoxElement.style.height = '0px';
            this.selectionBoxElement.style.display = 'block';
          }
          break;
        }
        case PointerEventTypes.POINTERMOVE: {
          if (this.isDragging) {
            const currentX = pointerInfo.event.clientX;
            const currentY = pointerInfo.event.clientY;
            const left = Math.min(this.dragStartX, currentX);
            const top = Math.min(this.dragStartY, currentY);
            const width = Math.abs(currentX - this.dragStartX);
            const height = Math.abs(currentY - this.dragStartY);

            this.selectionBoxElement.style.left = `${left}px`;
            this.selectionBoxElement.style.top = `${top}px`;
            this.selectionBoxElement.style.width = `${width}px`;
            this.selectionBoxElement.style.height = `${height}px`;
          }
          break;
        }
        case PointerEventTypes.POINTERUP: {
          if (pointerInfo.event.button === 0 && this.isDragging) { // Left Click Up
            this.isDragging = false;
            this.selectionBoxElement.style.display = 'none';

            const dx = Math.abs(pointerInfo.event.clientX - this.dragStartX);
            const dy = Math.abs(pointerInfo.event.clientY - this.dragStartY);

            if (dx < 5 && dy < 5) {
              // Single Click Pick
              this.handleSingleClick(pointerInfo.event);
            } else {
              // Drag Box Select
              this.handleBoxSelect(this.dragStartX, this.dragStartY, pointerInfo.event.clientX, pointerInfo.event.clientY);
            }
          } else if (pointerInfo.event.button === 2) { // Right Click (Issue Context Command)
            this.handleRightClick(pointerInfo.event);
          }
          break;
        }
      }
    });

    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleSingleClick(evt: { clientX: number; clientY: number }): void {
    const pickResult = this.renderer.scene.pick(evt.clientX, evt.clientY);
    if (pickResult && pickResult.hit && pickResult.pickedMesh) {
      const meshName = pickResult.pickedMesh.name;
      if (meshName.startsWith('entity_')) {
        const entityId = parseInt(meshName.replace('entity_', ''), 10);
        useUIStore.getState().setSelectedEntityIds([entityId]);
        return;
      }
    }
    // Deselect if ground clicked
    useUIStore.getState().setSelectedEntityIds([]);
  }

  private handleBoxSelect(x1: number, y1: number, x2: number, y2: number): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    const selectedIds: number[] = [];
    const playerIdx = useUIStore.getState().activePlayerIndex;
    const snapshot = useUIStore.getState().snapshot;

    if (snapshot) {
      for (const e of snapshot.entities) {
        if (e.playerIndex === playerIdx && !e.isBuilding) {
          const screenPos = Vector3.Project(
            new Vector3(e.position.x / 1000, 0, e.position.y / 1000),
            Matrix.Identity(),
            this.renderer.scene.getTransformMatrix(),
            this.renderer.camera.viewport.toGlobal(window.innerWidth, window.innerHeight)
          );

          if (screenPos.x >= minX && screenPos.x <= maxX && screenPos.y >= minY && screenPos.y <= maxY) {
            selectedIds.push(e.id);
          }
        }
      }
    }

    useUIStore.getState().setSelectedEntityIds(selectedIds);
  }

  private handleRightClick(evt: { clientX: number; clientY: number }): void {
    const selectedIds = useUIStore.getState().selectedEntityIds;
    if (selectedIds.length === 0) return;

    const pickResult = this.renderer.scene.pick(evt.clientX, evt.clientY);
    if (!pickResult || !pickResult.hit) return;

    const snapshot = useUIStore.getState().snapshot;
    const playerIdx = useUIStore.getState().activePlayerIndex;

    // Check if clicked entity
    if (pickResult.pickedMesh && pickResult.pickedMesh.name.startsWith('entity_')) {
      const targetId = parseInt(pickResult.pickedMesh.name.replace('entity_', ''), 10);
      const targetEntity = snapshot?.entities.find(e => e.id === targetId);

      if (targetEntity) {
        if (targetEntity.playerIndex !== playerIdx) {
          // Issue Attack Command
          this.onCommandDispatch({
            type: CommandType.ATTACK,
            entityIds: selectedIds,
            targetEntityId: targetId,
            playerIndex: playerIdx,
            tick: snapshot?.tick ?? 0
          });
          return;
        }
      }
    }

    // Default ground click -> Issue MOVE command
    if (pickResult.pickedPoint) {
      const targetX = Math.round(pickResult.pickedPoint.x * 1000);
      const targetY = Math.round(pickResult.pickedPoint.z * 1000);

      this.onCommandDispatch({
        type: CommandType.MOVE,
        entityIds: selectedIds,
        targetX,
        targetY,
        playerIndex: playerIdx,
        tick: snapshot?.tick ?? 0
      });
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const keyNum = parseInt(e.key, 10);
    const selectedIds = useUIStore.getState().selectedEntityIds;

    if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 9) {
      if (e.ctrlKey) {
        // Save Hotkey Group
        this.hotkeyGroups.set(keyNum, [...selectedIds]);
        useUIStore.getState().addEvaLog(`Группа ${keyNum} сохранена (${selectedIds.length} единиц).`, 'INFO');
      } else {
        // Select Hotkey Group
        const groupIds = this.hotkeyGroups.get(keyNum) ?? [];
        useUIStore.getState().setSelectedEntityIds(groupIds);
      }
    } else if (e.key === 'Escape') {
      useUIStore.getState().setSelectedEntityIds([]);
    } else if (e.key === ' ') {
      // Space: Focus camera on last event
      this.renderer.camera.target.x = this.lastEventPos.x;
      this.renderer.camera.target.z = this.lastEventPos.z;
    }
  };

  public dispose(): void {
    if (this.selectionBoxElement.parentNode) {
      this.selectionBoxElement.parentNode.removeChild(this.selectionBoxElement);
    }
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}
