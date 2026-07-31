import React, { useEffect, useRef } from 'react';
import { RTSRenderer } from './renderer.js';
import { InputManager } from './inputManager.js';
import { MainHUD, useUIStore } from '@ra4/ui';
import { MatchLifecycleManager } from '@ra4/sim-core';
import { FactionId, PlayerType, PlayerCommand } from '@ra4/shared-types';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RTSRenderer | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const managerRef = useRef<MatchLifecycleManager | null>(null);
  const setSnapshot = useUIStore((s) => s.setSnapshot);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Initialize Babylon 3D Renderer
    const renderer = new RTSRenderer(canvasRef.current);
    rendererRef.current = renderer;

    // 2. Initialize MatchLifecycleManager (Stage 1 Architecture)
    const manager = new MatchLifecycleManager();
    managerRef.current = manager;

    manager.initialize({
      seed: 1337,
      tickRate: 30,
      players: [
        { name: 'Игрок (СССР)', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'ИИ-Соперник (Альянс)', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
      ]
    });

    const handleDispatch = (cmd: PlayerCommand) => {
      manager.commandBus.dispatch(cmd);
    };

    // 3. Initialize InputManager (Stage 2 Controls & Selection)
    const inputManager = new InputManager(renderer, canvasRef.current, handleDispatch);
    inputManagerRef.current = inputManager;

    // 4. Start Fixed-Step Loop
    manager.start((snapshot) => {
      renderer.updateScene(snapshot);
      setSnapshot(snapshot);
    });

    return () => {
      inputManager.dispose();
      manager.dispose();
      renderer.dispose();
    };
  }, [setSnapshot]);

  const handleIssueCommand = (cmd: PlayerCommand) => {
    if (managerRef.current) {
      managerRef.current.commandBus.dispatch(cmd);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} id="renderCanvas" />
      <MainHUD onIssueCommand={handleIssueCommand} />
    </div>
  );
};
