import React, { useEffect, useRef, useState } from 'react';
import { RTSRenderer } from './renderer.js';
import { InputManager } from './inputManager.js';
import { MainHUD, SkirmishMenu, AssetGallery, TitleScreen, MainMenuScreen, useUIStore } from '@ra4/ui';
import { MatchLifecycleManager } from '@ra4/sim-core';
import { FactionId, PlayerType, PlayerCommand } from '@ra4/shared-types';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RTSRenderer | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const managerRef = useRef<MatchLifecycleManager | null>(null);

  const [currentScreen, setCurrentScreen] = useState<'TITLE' | 'MAIN_MENU' | 'MATCH' | 'GALLERY'>('TITLE');
  const setSnapshot = useUIStore((s) => s.setSnapshot);

  const startMatch = () => {
    if (!canvasRef.current) return;

    if (managerRef.current) {
      managerRef.current.dispose();
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }

    const renderer = new RTSRenderer(canvasRef.current);
    rendererRef.current = renderer;

    const manager = new MatchLifecycleManager();
    managerRef.current = manager;

    manager.initialize({
      seed: Math.floor(Math.random() * 1000000),
      tickRate: 30,
      players: [
        { name: 'Игрок (СССР)', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
        { name: 'ИИ-Соперник (Альянс)', factionId: FactionId.ALLIANCE, type: PlayerType.AI_MEDIUM, team: 1 }
      ]
    });

    const handleDispatch = (cmd: PlayerCommand) => {
      manager.commandBus.dispatch(cmd);
    };

    const inputManager = new InputManager(renderer, canvasRef.current, handleDispatch);
    inputManagerRef.current = inputManager;

    manager.start((snapshot) => {
      renderer.updateScene(snapshot);
      setSnapshot(snapshot);
    });

    setCurrentScreen('MATCH');
  };

  const handleMenuSelect = (option: string) => {
    if (option === 'SKIRMISH') {
      startMatch();
    } else if (option === 'EXIT') {
      setCurrentScreen('TITLE');
    }
  };

  useEffect(() => {
    return () => {
      inputManagerRef.current?.dispose();
      managerRef.current?.dispose();
      rendererRef.current?.dispose();
    };
  }, []);

  const handleIssueCommand = (cmd: PlayerCommand) => {
    if (managerRef.current) {
      managerRef.current.commandBus.dispatch(cmd);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} id="renderCanvas" />
      {currentScreen === 'TITLE' && <TitleScreen onEnter={() => setCurrentScreen('MAIN_MENU')} />}
      {currentScreen === 'MAIN_MENU' && <MainMenuScreen onSelectOption={handleMenuSelect} />}
      {currentScreen === 'MATCH' && <MainHUD onIssueCommand={handleIssueCommand} />}
      {currentScreen === 'MATCH' && <SkirmishMenu onStartMatch={startMatch} onRestartMatch={startMatch} onOpenGallery={() => setCurrentScreen('GALLERY')} />}
      {currentScreen === 'GALLERY' && <AssetGallery onClose={() => setCurrentScreen('MATCH')} />}
    </div>
  );
};
