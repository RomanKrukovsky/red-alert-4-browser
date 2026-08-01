import { AbstractMesh, Node, Scene, Vector3, Matrix, PointerEventTypes, PointerInfo } from '@babylonjs/core';
import { RTSRenderer } from './renderer.js';
import { CommandType, EntityStateSnapshot, PlayerCommand, WorldSnapshot } from '@ra4/shared-types';
import { OFFICIAL_BUILDINGS } from '@ra4/content-runtime';
import { useUIStore, AdminConsoleService } from '@ra4/ui';
import { VoiceManager } from './audio/voiceManager.js';

const getPickedEntityId = (mesh: AbstractMesh): number | undefined => {
  let curr: Node | null = mesh;
  while (curr) {
    const metadataId = (curr as any).metadata?.entityId;
    if (typeof metadataId === 'number') return metadataId;
    const match = /entity_(\d+)/.exec(curr.name);
    if (match) return Number(match[1]);
    curr = curr.parent;
  }
  return undefined;
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
  private isShiftHeld: boolean = false;
  private isRmbHeld: boolean = false;
  private isMmbHeld: boolean = false;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private controlledEntityId: number | null = null;
  private lastDirectMoveTick: number = 0;
  private placementStructureId: string | null = null;
  private pendingCommandMode: CommandType.MOVE | CommandType.ATTACK | CommandType.ATTACK_MOVE | null = null;
  private handleWindowMouseUp!: (e: MouseEvent) => void;

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

    // Global mouseup guard — hides the selection box even when the pointer
    // is released outside the canvas (Babylon's onPointerObservable won't fire
    // in that case, leaving the cyan overlay stuck on screen).
    this.handleWindowMouseUp = (e: MouseEvent) => {
      if (e.button === 0 && this.isDragging) {
        this.isDragging = false;
        this.selectionBoxElement.style.display = 'none';
      }
    };
    window.addEventListener('mouseup', this.handleWindowMouseUp);

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
            } else if (this.placementStructureId) {
              this.updatePlacementPreview(pointerInfo.event);
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
          } else if (pointerInfo.event.button === 1) {
            this.isMmbHeld = true;
            this.prevMouseX = pointerInfo.event.clientX;
            this.prevMouseY = pointerInfo.event.clientY;
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
          } else if (this.isMmbHeld) {
            this.renderer.rtsCamera.pan(-((currentX - this.prevMouseX) * .045), (currentY - this.prevMouseY) * .045);
            this.prevMouseX = currentX;
            this.prevMouseY = currentY;
          } else if (this.placementStructureId) {
            this.updatePlacementPreview(pointerInfo.event);
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
          if (pointerInfo.event.button === 0 && this.placementStructureId) {
            this.placeStructure(pointerInfo.event);
          } else if (pointerInfo.event.button === 0 && this.isDragging && mode === 'RTS') { // Left Click Up
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
          } else if (pointerInfo.event.button === 1) {
            this.isMmbHeld = false;
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
    let entityId = pickResult?.pickedMesh ? getPickedEntityId(pickResult.pickedMesh) : undefined;

    if (entityId === undefined && pickResult?.pickedPoint) {
      const clickX = pickResult.pickedPoint.x * 1000;
      const clickY = pickResult.pickedPoint.z * 1000;
      const snapshot = useUIStore.getState().snapshot;
      const nearEntity = snapshot?.entities.find((e) => {
        const dx = e.position.x - clickX;
        const dy = e.position.y - clickY;
        return (dx * dx + dy * dy) <= (2500 * 2500);
      });
      if (nearEntity) entityId = nearEntity.id;
    }

    if (entityId !== undefined) {
      const currentSelected = useUIStore.getState().selectedEntityIds;
      if (this.isShiftHeld) {
        const newSelected = currentSelected.includes(entityId)
          ? currentSelected.filter((id) => id !== entityId)
          : [...currentSelected, entityId];
        useUIStore.getState().setSelectedEntityIds(newSelected);
      } else {
        useUIStore.getState().setSelectedEntityIds([entityId]);
      }
      const snapshot = useUIStore.getState().snapshot;
      const playerIdx = useUIStore.getState().activePlayerIndex;
      const unit = snapshot?.entities.find((e) => e.id === entityId && e.playerIndex === playerIdx);
      if (unit) {
        VoiceManager.getInstance().playUnitBark(unit.specId, 'Selected');
      }
      return;
    }
    useUIStore.getState().setSelectedEntityIds([]);
  }

  public beginBuildingPlacement(structureId: string): void {
    const structure = OFFICIAL_BUILDINGS.find((item) => item.id === structureId);
    if (!structure) return;
    this.placementStructureId = structure.id;
    this.renderer.setPlacementGhost(true, structure.gridWidth, structure.gridHeight);
    useUIStore.getState().addEvaLog(`Размещение: ${structure.name}. Кликните по полю или нажмите Escape.`, 'INFO');
  }

  public beginCommandMode(mode: CommandType.MOVE | CommandType.ATTACK | CommandType.ATTACK_MOVE): void {
    const selectedIds = useUIStore.getState().selectedEntityIds;
    if (selectedIds.length === 0) return;
    this.pendingCommandMode = mode;
    useUIStore.getState().addEvaLog(mode === CommandType.MOVE ? 'Режим движения: укажите точку на поле.' : mode === CommandType.ATTACK ? 'Режим атаки: укажите цель противника.' : 'Режим атаки-в-движении: укажите точку на поле.', 'INFO');
  }

  private updatePlacementPreview(evt: { clientX: number; clientY: number }): void {
    if (!this.placementStructureId) return;
    const pickResult = this.renderer.scene.pick(evt.clientX, evt.clientY);
    if (!pickResult?.pickedPoint) return;
    const gridX = Math.round(pickResult.pickedPoint.x);
    const gridY = Math.round(pickResult.pickedPoint.z);
    const isValid = gridX > 1 && gridX < 63 && gridY > 1 && gridY < 63;
    this.renderer.updateGhostPosition(gridX, gridY, isValid);
  }

  private placeStructure(evt: { clientX: number; clientY: number }): void {
    if (!this.placementStructureId) return;
    const pickResult = this.renderer.scene.pick(evt.clientX, evt.clientY);
    if (!pickResult?.pickedPoint) return;
    const snapshot = useUIStore.getState().snapshot;
    this.onCommandDispatch({
      type: CommandType.BUILD_STRUCTURE,
      structureId: this.placementStructureId,
      gridX: Math.round(pickResult.pickedPoint.x),
      gridY: Math.round(pickResult.pickedPoint.z),
      entityIds: [],
      playerIndex: useUIStore.getState().activePlayerIndex,
      tick: (snapshot?.tick ?? 0) + 1,
    });
    this.cancelBuildingPlacement();
  }

  private cancelBuildingPlacement(): void {
    this.placementStructureId = null;
    this.renderer.setPlacementGhost(false);
  }

  private handleBoxSelect(x1: number, y1: number, x2: number, y2: number): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    const boxSelectedIds: number[] = [];
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
            boxSelectedIds.push(e.id);
          }
        }
      }
    }

    const previousSelected = this.isShiftHeld ? useUIStore.getState().selectedEntityIds : [];
    const newSelected = [...new Set([...previousSelected, ...boxSelectedIds])];
    
    useUIStore.getState().setSelectedEntityIds(newSelected);

    if (boxSelectedIds.length > 0 && snapshot) {
      const leadUnit = snapshot.entities.find((e) => e.id === boxSelectedIds[0]);
      if (leadUnit) {
        VoiceManager.getInstance().playUnitBark(leadUnit.specId, 'Selected');
      }
    }
  }

  private handleRightClick(evt: { clientX: number; clientY: number }): void {
    const selectedIds = useUIStore.getState().selectedEntityIds;
    if (selectedIds.length === 0) return;

    const pickResult = this.renderer.scene.pick(evt.clientX, evt.clientY);
    if (!pickResult || !pickResult.hit) return;

    const snapshot = useUIStore.getState().snapshot;
    const playerIdx = useUIStore.getState().activePlayerIndex;

    const leadUnit = snapshot?.entities.find((e) => e.id === selectedIds[0] && e.playerIndex === playerIdx);

    let targetId = pickResult.pickedMesh ? getPickedEntityId(pickResult.pickedMesh) : undefined;
    if (targetId === undefined && pickResult.pickedPoint) {
      const clickX = pickResult.pickedPoint.x * 1000;
      const clickY = pickResult.pickedPoint.z * 1000;
      const enemyNear = snapshot?.entities.find((e) => {
        if (e.playerIndex === playerIdx) return false;
        const dx = e.position.x - clickX;
        const dy = e.position.y - clickY;
        return (dx * dx + dy * dy) <= (3000 * 3000);
      });
      if (enemyNear) targetId = enemyNear.id;
    }

    if (targetId !== undefined) {
      const targetEntity = snapshot?.entities.find((e) => e.id === targetId);

      if (targetEntity && targetEntity.playerIndex !== playerIdx && this.pendingCommandMode !== CommandType.MOVE) {
        this.onCommandDispatch({
          type: CommandType.ATTACK,
          entityIds: selectedIds,
          targetEntityId: targetId,
          playerIndex: playerIdx,
          tick: snapshot?.tick ?? 0,
        });
        if (leadUnit) {
          VoiceManager.getInstance().playUnitBark(leadUnit.specId, 'Attack');
        }
        this.pendingCommandMode = null;
        return;
      }

      if (this.pendingCommandMode === CommandType.ATTACK) {
        useUIStore.getState().addEvaLog('Выберите вражескую цель для атаки.', 'WARN');
        return;
      }

      if (targetEntity) {
        this.dispatchMove(selectedIds, targetEntity.position.x, targetEntity.position.y, playerIdx, snapshot, leadUnit);
        this.pendingCommandMode = null;
        return;
      }
    }

    if (pickResult.pickedPoint) {
      const targetX = Math.round(pickResult.pickedPoint.x * 1000);
      const targetY = Math.round(pickResult.pickedPoint.z * 1000);
      if (this.pendingCommandMode !== CommandType.ATTACK) {
        // Handle ATTACK_MOVE
        if (this.pendingCommandMode === CommandType.ATTACK_MOVE) {
          this.onCommandDispatch({
            type: CommandType.ATTACK_MOVE,
            entityIds: selectedIds,
            targetX,
            targetY,
            playerIndex: playerIdx,
            tick: snapshot?.tick ?? 0,
          });
          if (leadUnit) VoiceManager.getInstance().playUnitBark(leadUnit.specId, 'Attack');
        } else {
          this.dispatchMove(selectedIds, targetX, targetY, playerIdx, snapshot, leadUnit);
        }
        this.pendingCommandMode = null;
      } else {
        useUIStore.getState().addEvaLog('Выберите вражескую цель для атаки.', 'WARN');
      }
    }
  }

  private dispatchMove(selectedIds: number[], targetX: number, targetY: number, playerIdx: number, snapshot: WorldSnapshot | null, leadUnit: EntityStateSnapshot | undefined): void {
    this.onCommandDispatch({
      type: CommandType.MOVE,
      entityIds: selectedIds,
      targetX,
      targetY,
      playerIndex: playerIdx,
      tick: snapshot?.tick ?? 0,
    });
    if (leadUnit) VoiceManager.getInstance().playUnitBark(leadUnit.specId, 'Move');
  }

  private handleDirectFire(evt: { clientX: number; clientY: number }): void {
    if (!this.controlledEntityId) return;

    const pickResult = this.renderer.scene.pick(evt.clientX, evt.clientY);
    if (!pickResult || !pickResult.hit) return;

    const snapshot = useUIStore.getState().snapshot;
    const playerIdx = useUIStore.getState().activePlayerIndex;
    const unit = snapshot?.entities.find((e) => e.id === this.controlledEntityId);

    const pickedEntityId = pickResult.pickedMesh ? getPickedEntityId(pickResult.pickedMesh) : undefined;
    if (pickedEntityId !== undefined) {
      const targetId = pickedEntityId;
      this.onCommandDispatch({
        type: CommandType.ATTACK,
        entityIds: [this.controlledEntityId],
        targetEntityId: targetId,
        playerIndex: playerIdx,
        tick: snapshot?.tick ?? 0,
      });
      if (unit) {
        VoiceManager.getInstance().playUnitBark(unit.specId, 'Attack');
      }
    } else if (pickResult.pickedPoint) {
      const targetX = Math.round(pickResult.pickedPoint.x * 1000);
      const targetY = Math.round(pickResult.pickedPoint.z * 1000);
      this.onCommandDispatch({
        type: CommandType.MOVE,
        entityIds: [this.controlledEntityId],
        targetX,
        targetY,
        playerIndex: playerIdx,
        tick: snapshot?.tick ?? 0,
      });
      if (unit) {
        VoiceManager.getInstance().playUnitBark(unit.specId, 'Move');
      }
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

    if (e.key === 'Shift') {
      this.isShiftHeld = true;
    } else if (e.key === ' ') {
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
        const ownedUnit = snapshot?.entities.find((ent) => ent.id === selected[0] && ent.playerIndex === playerIdx && !ent.isBuilding);

        if (ownedUnit) {
          this.controlledEntityId = ownedUnit.id;
          useUIStore.getState().setInputMode('DirectUnitControl');
          VoiceManager.getInstance().playEVAMessage('DIRECT_CONTROL');
          VoiceManager.getInstance().playUnitBark(ownedUnit.specId, 'Elite', true);
        } else {
          useUIStore.getState().addEvaLog('Прямое управление доступно только для собственных юнитов.', 'WARN');
        }
      }
    } else if (e.key === 'Escape') {
      if (this.placementStructureId) {
        this.cancelBuildingPlacement();
      } else if (mode === 'DirectUnitControl') {
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
      } else if (e.key.toLowerCase() === 'b') {
        useUIStore.getState().setActiveCategoryTab('BUILDINGS');
      } else if (['q', 'w', 'e', 'r'].includes(e.key.toLowerCase())) {
        const slots = ['q', 'w', 'e', 'r'];
        const slotIndex = slots.indexOf(e.key.toLowerCase());
        
        const state = useUIStore.getState();
        const activeTab = state.activeCategoryTab;
        const factionId = state.activeFaction;
        
        // Very basic quick production hotkey implementation
        // Normally this would look up the specific items available in the currently active tab
        // But for this vertical slice, we'll just log an EVA message
        useUIStore.getState().addEvaLog(`Горячая клавиша ${e.key.toUpperCase()} нажата.`, 'INFO');
      } else if (e.key.toLowerCase() === 'a') {
        if (selectedIds.length > 0) {
          this.beginCommandMode(CommandType.ATTACK_MOVE);
        }
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      this.isShiftHeld = false;
    }
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

  public focusCamera(worldX: number, worldY: number): void {
    // worldX and worldY from HUD are in 0-64000 scale, camera expects 0-64
    this.renderer.rtsCamera.focusOnPosition(worldX / 1000, worldY / 1000);
  }

  public dispose(): void {
    this.cancelBuildingPlacement();
    this.pendingCommandMode = null;
    this.isDragging = false;
    if (this.selectionBoxElement.parentNode) {
      this.selectionBoxElement.parentNode.removeChild(this.selectionBoxElement);
    }
    AdminConsoleService.getInstance().onDispatchCommand = undefined;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mouseup', this.handleWindowMouseUp);
  }
}
