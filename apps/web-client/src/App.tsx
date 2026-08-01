import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MatchLifecycleManager } from '@ra4/sim-core';
import { FactionId, MatchState, PlayerCommand, PlayerType, WorldSnapshot } from '@ra4/shared-types';
import { useUIStore } from '@ra4/ui';
import { InputManager } from './inputManager.js';
import { RTSRenderer } from './renderer.js';
import { GameplayHUD, PauseOverlay } from './ui/hud/GameplayHUD.js';
import { factionByHash, resolveScreen, screenByHash } from './ui/routing.js';
import { BriefingScreen, CampaignSelectScreen, CommandCenterScreen, FactionCampaignScreen, MainMenuScreen, MatchResultScreen, SplashScreen, StrategicMapScreen, TransmissionScreen } from './ui/screens/FrontEndScreens.js';
import { LoadingScreen, SkirmishSetupScreen } from './ui/screens/SkirmishScreens.js';
import { FrontendScreen, LoadingStage, MatchSetup } from './ui/types.js';
import { MusicManager } from './audio/musicManager.js';
import { MusicPlayerWidget } from './ui/components/MusicPlayerWidget.js';
import './ui/ra4-ui.css';

const defaultSetup: MatchSetup = {
  faction: FactionId.USSR,
  opponentFaction: FactionId.ALLIANCE,
  mapName: 'КИЕВ — КРАСНЫЙ РУБЕЖ',
  difficulty: 'NORMAL',
  startingCredits: 10000,
  gameSpeed: 'NORMAL',
};

const factionCampaignHash: Record<FactionId, string> = {
  [FactionId.USSR]: '#/campaign/soviet',
  [FactionId.ALLIANCE]: '#/campaign/allies',
  [FactionId.ORIENTAL_COALITION]: '#/campaign/coalition',
  [FactionId.CHRONOLEGION]: '#/campaign/chronolegion',
  [FactionId.NEUTRAL]: '#/campaign/soviet',
};

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RTSRenderer | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const managerRef = useRef<MatchLifecycleManager | null>(null);
  const snapshotHandlerRef = useRef<(snapshot: WorldSnapshot) => void>(() => undefined);
  const hasReceivedSnapshotRef = useRef(false);
  const [currentScreen, setCurrentScreen] = useState<FrontendScreen>(() => resolveScreen(window.location.hash));
  const [setup, setSetup] = useState<MatchSetup>(() => ({ ...defaultSetup, faction: factionByHash[window.location.hash] ?? defaultSetup.faction }));
  const [loadingStages, setLoadingStages] = useState<LoadingStage[]>([]);
  const [paused, setPaused] = useState(false);
  const snapshot = useUIStore((state) => state.snapshot);
  const selectedEntityIds = useUIStore((state) => state.selectedEntityIds);

  const navigate = useCallback((screen: FrontendScreen, hash: string) => {
    window.location.hash = hash;
    setCurrentScreen(screen);
  }, []);

  const disposeMatch = useCallback(() => {
    inputManagerRef.current?.dispose();
    managerRef.current?.dispose();
    rendererRef.current?.dispose();
    inputManagerRef.current = null;
    managerRef.current = null;
    rendererRef.current = null;
    hasReceivedSnapshotRef.current = false;
  }, []);

  const initializeMatch = useCallback((matchSetup: MatchSetup) => {
    if (!canvasRef.current) return;
    disposeMatch();
    setLoadingStages((stages) => stages.map((stage) => stage.id === 'renderer' ? { ...stage, status: 'active', progress: 28 } : stage));

    const renderer = new RTSRenderer(canvasRef.current);
    rendererRef.current = renderer;
    setLoadingStages((stages) => stages.map((stage) => stage.id === 'renderer' ? { ...stage, status: 'complete', progress: 38 } : stage.id === 'simulation' ? { ...stage, status: 'active', progress: 50 } : stage));

    const manager = new MatchLifecycleManager();
    managerRef.current = manager;
    manager.initialize({
      seed: Math.floor(Math.random() * 1_000_000),
      tickRate: matchSetup.gameSpeed === 'FAST' ? 36 : matchSetup.gameSpeed === 'SLOW' ? 24 : 30,
      startingCredits: matchSetup.startingCredits,
      players: [
        { name: 'Игрок', factionId: matchSetup.faction, type: PlayerType.HUMAN, team: 0 },
        { name: 'ИИ-Соперник', factionId: matchSetup.opponentFaction, type: matchSetup.difficulty === 'HARD' ? PlayerType.AI_HARD : matchSetup.difficulty === 'EASY' ? PlayerType.AI_EASY : PlayerType.AI_MEDIUM, team: 1 },
      ],
    });
    setLoadingStages((stages) => stages.map((stage) => stage.id === 'simulation' ? { ...stage, status: 'complete', progress: 63 } : stage.id === 'input' ? { ...stage, status: 'active', progress: 72 } : stage));

    const inputManager = new InputManager(renderer, canvasRef.current, (command) => manager.commandBus.dispatch(command));
    inputManagerRef.current = inputManager;
    setLoadingStages((stages) => stages.map((stage) => stage.id === 'input' ? { ...stage, status: 'complete', progress: 82 } : stage.id === 'snapshot' ? { ...stage, status: 'active', progress: 90 } : stage));

    const handleSnapshot = (nextSnapshot: WorldSnapshot) => {
      renderer.updateScene(nextSnapshot);
      useUIStore.getState().setSnapshot(nextSnapshot);
      if (manager.sim?.matchState === MatchState.FINISHED) {
        manager.stop();
        navigate(manager.sim.winnerTeam === 0 ? 'VICTORY' : 'DEFEAT', manager.sim.winnerTeam === 0 ? '#/victory' : '#/defeat');
        return;
      }
      if (!hasReceivedSnapshotRef.current) {
        hasReceivedSnapshotRef.current = true;
        setLoadingStages((stages) => stages.map((stage) => ({ ...stage, status: 'complete', progress: 100 })));
        window.requestAnimationFrame(() => navigate('MATCH', `#/hud/${matchSetup.faction === FactionId.ALLIANCE ? 'allies' : matchSetup.faction === FactionId.ORIENTAL_COALITION ? 'coalition' : matchSetup.faction === FactionId.CHRONOLEGION ? 'chronolegion' : 'soviet'}`));
      }
    };
    snapshotHandlerRef.current = handleSnapshot;
    manager.start(handleSnapshot);
  }, [disposeMatch, navigate]);

  const startMatch = useCallback((matchSetup: MatchSetup) => {
    setSetup(matchSetup);
    setLoadingStages([
      { id: 'manifest', label: 'ПРОВЕРКА МАНИФЕСТА РЕСУРСОВ', progress: 12, status: 'complete' },
      { id: 'renderer', label: 'BABYLON PRESENTATION LAYER', progress: 12, status: 'pending' },
      { id: 'simulation', label: 'ИНИЦИАЛИЗАЦИЯ SIM-CORE', progress: 12, status: 'pending' },
      { id: 'input', label: 'КОМАНДНЫЙ ПРОТОКОЛ И HUD', progress: 12, status: 'pending' },
      { id: 'snapshot', label: 'ПЕРВЫЙ СНИМОК МИРА', progress: 12, status: 'pending' },
    ]);
    navigate('LOADING', '#/loading');
    window.requestAnimationFrame(() => initializeMatch(matchSetup));
  }, [initializeMatch, navigate]);

  useEffect(() => {
    const onHashChange = () => {
      const nextScreen = screenByHash[window.location.hash];
      if (!nextScreen) return;
      const directFaction = factionByHash[window.location.hash];
      if (directFaction) setSetup((current) => ({ ...current, faction: directFaction }));
      setCurrentScreen(nextScreen);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (currentScreen === 'MATCH' && !managerRef.current) startMatch({ ...setup, faction: factionByHash[window.location.hash] ?? setup.faction });
  }, [currentScreen, setup, startMatch]);

  useEffect(() => {
    MusicManager.getInstance().handleScreenChange(currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || currentScreen !== 'MATCH') return;
      if (paused) managerRef.current?.resume(snapshotHandlerRef.current);
      else managerRef.current?.pause();
      setPaused((value) => !value);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [currentScreen, paused]);

  useEffect(() => disposeMatch, [disposeMatch]);

  const issueCommand = (command: PlayerCommand) => managerRef.current?.commandBus.dispatch(command);
  const pauseMatch = () => {
    managerRef.current?.pause();
    setPaused(true);
  };
  const resumeMatch = () => {
    managerRef.current?.resume(snapshotHandlerRef.current);
    setPaused(false);
  };
  const returnToMenu = () => {
    setPaused(false);
    disposeMatch();
    navigate('MAIN_MENU', '#/menu');
  };

  return (
    <div className="ra4-app-shell">
      <canvas ref={canvasRef} id="renderCanvas" className={currentScreen === 'MATCH' ? 'is-visible' : ''} />
      {currentScreen === 'SPLASH' && <SplashScreen onEnter={() => navigate('MAIN_MENU', '#/menu')} />}
      {currentScreen === 'MAIN_MENU' && <MainMenuScreen onSelect={(option) => option === 'CAMPAIGN' ? navigate('CAMPAIGN_SELECT', '#/campaign') : option === 'SKIRMISH' ? navigate('SKIRMISH_SETUP', '#/skirmish') : option === 'EXIT' ? navigate('SPLASH', '#/splash') : undefined} />}
      {currentScreen === 'CAMPAIGN_SELECT' && <CampaignSelectScreen onBack={() => navigate('MAIN_MENU', '#/menu')} onSelect={(faction) => { setSetup((current) => ({ ...current, faction })); navigate('FACTION_CAMPAIGN', factionCampaignHash[faction]); }} />}
      {currentScreen === 'FACTION_CAMPAIGN' && setup.faction !== FactionId.NEUTRAL && <FactionCampaignScreen faction={setup.faction} onBack={() => navigate('CAMPAIGN_SELECT', '#/campaign')} onContinue={() => setup.faction === FactionId.ALLIANCE ? navigate('COMMAND_CENTER', '#/allied-command') : setup.faction === FactionId.ORIENTAL_COALITION ? navigate('COMMAND_CENTER', '#/coalition-command') : navigate('STRATEGIC_MAP', '#/strategic-map')} />}
      {currentScreen === 'COMMAND_CENTER' && (setup.faction === FactionId.ALLIANCE || setup.faction === FactionId.ORIENTAL_COALITION) && <CommandCenterScreen faction={setup.faction} onBack={() => navigate('FACTION_CAMPAIGN', factionCampaignHash[setup.faction])} onContinue={() => navigate('STRATEGIC_MAP', '#/strategic-map')} />}
      {currentScreen === 'STRATEGIC_MAP' && <StrategicMapScreen onBack={() => navigate('CAMPAIGN_SELECT', '#/campaign')} onContinue={() => navigate('BRIEFING', '#/briefing')} />}
      {currentScreen === 'BRIEFING' && <BriefingScreen onBack={() => navigate('STRATEGIC_MAP', '#/strategic-map')} onContinue={() => navigate('TRANSMISSION', '#/transmission')} />}
      {currentScreen === 'TRANSMISSION' && <TransmissionScreen onBack={() => navigate('BRIEFING', '#/briefing')} onContinue={() => startMatch(setup)} />}
      {currentScreen === 'SKIRMISH_SETUP' && <SkirmishSetupScreen onBack={() => navigate('MAIN_MENU', '#/menu')} onStart={startMatch} />}
      {currentScreen === 'LOADING' && <LoadingScreen setup={setup} stages={loadingStages} />}
      {currentScreen === 'MATCH' && <GameplayHUD faction={setup.faction} snapshot={snapshot} selectedEntityIds={selectedEntityIds} onIssueCommand={issueCommand} onPause={pauseMatch} />}
      {currentScreen === 'MATCH' && paused && <PauseOverlay onResume={resumeMatch} onExit={returnToMenu} />}
      {currentScreen === 'VICTORY' && <MatchResultScreen result="victory" onMenu={returnToMenu} onRetry={() => startMatch(setup)} />}
      {currentScreen === 'DEFEAT' && <MatchResultScreen result="defeat" onMenu={returnToMenu} onRetry={() => startMatch(setup)} />}
      <MusicPlayerWidget />
    </div>
  );
};
