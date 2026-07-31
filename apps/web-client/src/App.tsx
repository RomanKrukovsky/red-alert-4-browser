import React, { useEffect, useRef, useState } from 'react';
import { RTSRenderer } from './renderer.js';
import { InputManager } from './inputManager.js';
import {
  MainHUD, SkirmishMenu, AssetGallery, TitleScreen, MainMenuScreen,
  CampaignSelectScreen, SkirmishSetupScreen, LoadingScreen, MissionBriefingScreen, StrategicMapScreen,
  useUIStore
} from '@ra4/ui';
import { MatchLifecycleManager } from '@ra4/sim-core';
import { FactionId, PlayerType, PlayerCommand } from '@ra4/shared-types';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RTSRenderer | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const managerRef = useRef<MatchLifecycleManager | null>(null);

  type ScreenType = 'MATCH' | 'TITLE' | 'MAIN_MENU' | 'CAMPAIGN_SELECT' | 'STRATEGIC_MAP' | 'BRIEFING' | 'SKIRMISH_SETUP' | 'LOADING' | 'GALLERY';
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('MATCH');
  const [loadProgress, setLoadProgress] = useState(0);

  const initMatch = () => {
    if (!canvasRef.current) return;

    if (managerRef.current) managerRef.current.dispose();
    if (rendererRef.current) rendererRef.current.dispose();

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
      useUIStore.getState().setSnapshot(snapshot);
    });
  };

  useEffect(() => {
    initMatch();
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
      {/* 3D Canvas Layer */}
      <canvas ref={canvasRef} id="renderCanvas" />

      {/* Screen Router Overlays */}
      {currentScreen === 'TITLE' && <TitleScreen onEnter={() => setCurrentScreen('MAIN_MENU')} />}
      {currentScreen === 'MAIN_MENU' && <MainMenuScreen onSelectOption={(opt) => {
        if (opt === 'CAMPAIGN') setCurrentScreen('CAMPAIGN_SELECT');
        else if (opt === 'SKIRMISH') setCurrentScreen('SKIRMISH_SETUP');
        else if (opt === 'EXIT') setCurrentScreen('TITLE');
        else setCurrentScreen('MATCH');
      }} />}
      {currentScreen === 'CAMPAIGN_SELECT' && <CampaignSelectScreen onSelectFaction={() => setCurrentScreen('STRATEGIC_MAP')} onBack={() => setCurrentScreen('MAIN_MENU')} />}
      {currentScreen === 'STRATEGIC_MAP' && <StrategicMapScreen onSelectMission={() => setCurrentScreen('BRIEFING')} onBack={() => setCurrentScreen('CAMPAIGN_SELECT')} />}
      {currentScreen === 'BRIEFING' && <MissionBriefingScreen onContinue={() => setCurrentScreen('MATCH')} onBack={() => setCurrentScreen('STRATEGIC_MAP')} />}
      {currentScreen === 'SKIRMISH_SETUP' && <SkirmishSetupScreen onStartMatch={() => setCurrentScreen('MATCH')} onBack={() => setCurrentScreen('MAIN_MENU')} />}
      {currentScreen === 'LOADING' && <LoadingScreen progress={100} />}
      {currentScreen === 'MATCH' && <MainHUD onIssueCommand={handleIssueCommand} />}
      {currentScreen === 'MATCH' && <SkirmishMenu onStartMatch={initMatch} onRestartMatch={initMatch} onOpenGallery={() => setCurrentScreen('GALLERY')} />}
      {currentScreen === 'GALLERY' && <AssetGallery onClose={() => setCurrentScreen('MATCH')} />}

      {/* Dev Quick Screen Navigation Bar */}
      <div style={quickNavStyle}>
        <span style={{ fontSize: '11px', color: '#ff2a4b', fontWeight: 'bold', marginRight: '8px' }}>[RA4 DEV HUB]:</span>
        <button style={navBtnStyle(currentScreen === 'MATCH')} onClick={() => setCurrentScreen('MATCH')}>🎮 БОЙ</button>
        <button style={navBtnStyle(currentScreen === 'TITLE')} onClick={() => setCurrentScreen('TITLE')}>1. ЗАСТАВКА</button>
        <button style={navBtnStyle(currentScreen === 'MAIN_MENU')} onClick={() => setCurrentScreen('MAIN_MENU')}>2. МЕНЮ</button>
        <button style={navBtnStyle(currentScreen === 'CAMPAIGN_SELECT')} onClick={() => setCurrentScreen('CAMPAIGN_SELECT')}>3. КАМПАНИИ</button>
        <button style={navBtnStyle(currentScreen === 'STRATEGIC_MAP')} onClick={() => setCurrentScreen('STRATEGIC_MAP')}>8. КАРТА</button>
        <button style={navBtnStyle(currentScreen === 'BRIEFING')} onClick={() => setCurrentScreen('BRIEFING')}>9. БРИФИНГ</button>
        <button style={navBtnStyle(currentScreen === 'SKIRMISH_SETUP')} onClick={() => setCurrentScreen('SKIRMISH_SETUP')}>17. СХВАТКА</button>
        <button style={navBtnStyle(currentScreen === 'GALLERY')} onClick={() => setCurrentScreen('GALLERY')}>🖼️ 3D АССЕТЫ</button>
      </div>
    </div>
  );
};

const quickNavStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'rgba(6, 9, 15, 0.92)',
  border: '1px solid rgba(0, 255, 200, 0.4)',
  borderRadius: '20px',
  padding: '4px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  zIndex: 9999,
  boxShadow: '0 0 15px rgba(0, 255, 200, 0.2)'
};

const navBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(0, 255, 200, 0.25)' : 'transparent',
  color: active ? '#00ffc8' : '#aaa',
  border: active ? '1px solid #00ffc8' : '1px solid transparent',
  borderRadius: '12px',
  padding: '3px 10px',
  fontSize: '11px',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
});
