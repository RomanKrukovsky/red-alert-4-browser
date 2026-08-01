import { AbstractMesh, Scene, Vector3, Matrix, PointerEventTypes, PointerInfo } from '@babylonjs/core';
import { RTSRenderer } from './renderer.js';
import { CommandType, PlayerCommand } from '@ra4/shared-types';
import { useUIStore, AdminConsoleService } from '@ra4/ui';

const getPickedEntityId = (mesh: AbstractMesh): number | undefined => {
  const metadataId = mesh.metadata?.entityId;
  if (typeof metadataId === 'number') return metadataId;
  const match = /^entity_(\d+)$/.exec(mesh.name);
  return match ? Number(match[1]) : undefined;
};

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

  // Mode states
  private isSpaceHeld: boolean = false;
  private isRmbHeld: boolean = false;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private controlledEntityId: number | null = null;
  private lastDirectMoveTick: number = 0;

  constructor(renderer: RTSRenderer, canvas: HTMLCanvasElement, onCommandDispatch: (cmd: PlayerCommand) => void) {
    this.renderer = renderer;
    this.canvas = canvas;
    this.onCommandDispatch = onCommandDispatch;

    // Attach dispatch handler to AdminConsoleService
    AdminConsoleService.getInstance().onDispatchCommand = this.onCommandDispatch;

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
      const mode = useUIStore.getState().inputMode;
      if (mode === 'Console') return;

      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN: {
          if (pointerInfo.event.button === 0) { // Left Click Down
            if (mode === 'DirectUnitControl') {
              this.handleDirectFire(pointerInfo.event);
            } else if (mode === 'RTS') {
              this.isDragging = true;
              this.dragStartX = pointerInfo.event.clientX;
              this.dragStartY = pointerInfo.event.clientY;
              this.selectionBoxElement.style.left = `${this.dragStartX}px`;
              this.selectionBoxElement.style.top = `${this.dragStartY}px`;
              this.selectionBoxElement.style.width = '0px';
              this.selectionBoxElement.style.height = '0px';
              this.selectionBoxElement.style.display = 'block';
            }
          } else if (pointerInfo.event.button === 2) { // Right Click Down
            this.isRmbHeld = true;
            this.prevMouseX = pointerInfo.event.clientX;
            this.prevMouseY = pointerInfo.event.clientY;

            if (this.isSpaceHeld) {
              useUIStore.getState().setInputMode('FreeCamera');
              this.renderer.rtsCamera.setFreeCameraMode(true);
            }
          }
          break;
        }
        case PointerEventTypes.POINTERMOVE: {
          const currentX = pointerInfo.event.clientX;
          const currentY = pointerInfo.event.clientY;

          if (useUIStore.getState().inputMode === 'FreeCamera' && this.isRmbHeld) {
            const dx = currentX - this.prevMouseX;
            const dy = currentY - this.prevMouseY;
            this.renderer.rtsCamera.rotateFree(dx, dy);
            this.prevMouseX = currentX;
            this.prevMouseY = currentY;
          } else if (this.isDragging && mode === 'RTS') {
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
          if (pointerInfo.event.button === 0 && this.isDragging && mode === 'RTS') { // Left Click Up
            this.isDragging = false;
            this.selectionBoxElement.style.display = 'none';

            const dx = Math.abs(pointerInfo.event.clientX - this.dragStartX);
            const dy = Math.abs(pointerInfo.event.clientY - this.dragStartY);

            if (dx < 5 && dy < 5) {
              this.handleSingleClick(pointerInfo.event);
            } else {
              this.handleBoxSelect(this.dragStartX, this.dragStartY, pointerInfo.event.clientX, pointerInfo.event.clientY);
            }
          } else if (pointerInfo.event.button === 2) { // Right Click Up
            this.isRmbHeld = false;
            if (useUIStore.getState().inputMode === 'FreeCamera') {
              useUIStore.getState().setInputMode('RTS');
              this.renderer.rtsCamera.setFreeCameraMode(false);
            } else if (mode === 'RTS') {
              this.handleRightClick(pointerInfo.event);
            }
          }
          break;
        }
      }
    });

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleSingleClick(evt: { clientX: number; clientY: number }): void {
    const pickResult = this.renderer.scene.pick(evt.clientX, evt.clientY);
    if (pickResult && pickResult.hit && pickResult.pickedMesh) {
      const entityId = getPickedEntityId(pickResult.pickedMesh);
      if (entityId !== undefined) {
        useUIStore.getState().setSelectedEntityIds([entityId]);
        return;
      }
    }
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

    const pickedEntityId = pickResult.pickedMesh ? getPickedEntityId(pickResult.pickedMesh) : undefined;
    if (pickedEntityId !== undefined) {
      const targetId = pickedEntityId;
      const targetEntity = snapshot?.entities.find(e => e.id === targetId);

      if (targetEntity && targetEntity.playerIndex !== playerIdx) {
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

  private handleDirectFire(evt: { clientX: number; clientY: number }): void {
    if (!this.controlledEntityId) return;

    const pickResult = this.renderer.scene.pick(evt.clientX, evt.clientY);
    if (!pickResult || !pickResult.hit) return;

    const snapshot = useUIStore.getState().snapshot;
    const playerIdx = useUIStore.getState().activePlayerIndex;

    const pickedEntityId = pickResult.pickedMesh ? getPickedEntityId(pickResult.pickedMesh) : undefined;
    if (pickedEntityId !== undefined) {
      const targetId = pickedEntityId;
      this.onCommandDispatch({
        type: CommandType.ATTACK,
        entityIds: [this.controlledEntityId],
        targetEntityId: targetId,
        playerIndex: playerIdx,
        tick: snapshot?.tick ?? 0
      });
    } else if (pickResult.pickedPoint) {
      const targetX = Math.round(pickResult.pickedPoint.x * 1000);
      const targetY = Math.round(pickResult.pickedPoint.z * 1000);
      this.onCommandDispatch({
        type: CommandType.MOVE,
        entityIds: [this.controlledEntityId],
        targetX,
        targetY,
        playerIndex: playerIdx,
        tick: snapshot?.tick ?? 0
      });
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const mode = useUIStore.getState().inputMode;

    // Tilde / Backquote key -> Toggle Console Mode
    if (e.key === '`' || e.key === '~' || e.key === 'Ё' || e.key === 'ё') {
      e.preventDefault();
      if (mode === 'Console') {
        useUIStore.getState().setConsoleOpen(false);
        useUIStore.getState().setInputMode('RTS');
      } else {
        useUIStore.getState().setConsoleOpen(true);
        useUIStore.getState().setInputMode('Console');
      }
      return;
    }

    if (mode === 'Console') return; // Block all other hotkeys when console is open

    if (e.key === ' ') {
      this.isSpaceHeld = true;
      if (this.isRmbHeld) {
        useUIStore.getState().setInputMode('FreeCamera');
        this.renderer.rtsCamera.setFreeCameraMode(true);
      }
    } else if (e.key.toLowerCase() === 'f') { // F key -> Toggle Direct Unit Control Mode
      const selected = useUIStore.getState().selectedEntityIds;
      if (mode === 'DirectUnitControl') {
        useUIStore.getState().setInputMode('RTS');
        this.controlledEntityId = null;
        useUIStore.getState().addEvaLog('Прямое управление отключено. Возврат в RTS-режим.', 'INFO');
      } else if (selected.length > 0) {
        const playerIdx = useUIStore.getState().activePlayerIndex;
        const snapshot = useUIStore.getState().snapshot;
        const ownedUnit = snapshot?.entities.find(ent => ent.id === selected[0] && ent.playerIndex === playerIdx && !ent.isBuilding);

        if (ownedUnit) {
          this.controlledEntityId = ownedUnit.id;
          useUIStore.getState().setInputMode('DirectUnitControl');
          useUIStore.getState().addEvaLog(`Прямое управление объектом #${ownedUnit.id} [WASD / Стрельба LMB].`, 'INFO');
        } else {
          useUIStore.getState().addEvaLog('Прямое управление доступно только для собственных юнитов.', 'WARN');
        }
      }
    } else if (e.key === 'Escape') {
      if (mode === 'DirectUnitControl') {
        useUIStore.getState().setInputMode('RTS');
        this.controlledEntityId = null;
      } else {
        useUIStore.getState().setSelectedEntityIds([]);
      }
    } else if (mode === 'RTS') {
      const keyNum = parseInt(e.key, 10);
      const selectedIds = useUIStore.getState().selectedEntityIds;

      if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 9) {
        if (e.ctrlKey) {
          this.hotkeyGroups.set(keyNum, [...selectedIds]);
          useUIStore.getState().addEvaLog(`Группа ${keyNum} сохранена (${selectedIds.length} единиц).`, 'INFO');
        } else {
          const groupIds = this.hotkeyGroups.get(keyNum) ?? [];
          useUIStore.getState().setSelectedEntityIds(groupIds);
        }
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      this.isSpaceHeld = false;
      if (useUIStore.getState().inputMode === 'FreeCamera') {
        useUIStore.getState().setInputMode('RTS');
        this.renderer.rtsCamera.setFreeCameraMode(false);
      }
    }
  };

  public update(): void {
    const mode = useUIStore.getState().inputMode;

    if (mode === 'DirectUnitControl' && this.controlledEntityId) {
      const snapshot = useUIStore.getState().snapshot;
      const unit = snapshot?.entities.find(e => e.id === this.controlledEntityId);
      if (unit) {
        this.renderer.rtsCamera.trackUnitPosition(unit.position);
      } else {
        // Controlled unit lost or destroyed
        useUIStore.getState().setInputMode('RTS');
        this.controlledEntityId = null;
      }
    }
  }

  public dispose(): void {
    if (this.selectionBoxElement.parentNode) {
      this.selectionBoxElement.parentNode.removeChild(this.selectionBoxElement);
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
