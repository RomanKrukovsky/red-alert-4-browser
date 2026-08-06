import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CommandType, FactionId, MatchState, PlayerCommand, PlayerType, WorldSnapshot } from '@ra4/shared-types';
import { SimWorkerClient, SimFrame } from './sim/SimWorkerClient.js';
import { DEFAULT_DATABASE } from '@ra4/content-runtime';
import { useUIStore, AdminConsole, AdminConsoleService } from '@ra4/ui';
import { InputManager } from './inputManager.js';
import { RTSRenderer } from './renderer.js';
import { GameplayHUD, PauseOverlay } from './ui/hud/GameplayHUD.js';
import { factionByHash, resolveScreen, screenByHash } from './ui/routing.js';
import { BriefingScreen, CampaignSelectScreen, CommandCenterScreen, FactionCampaignScreen, MainMenuScreen, MatchResultScreen, SplashScreen, StrategicMapScreen, TransmissionScreen } from './ui/screens/FrontEndScreens.js';
import { LoadingScreen, SkirmishSetupScreen } from './ui/screens/SkirmishScreens.js';
import { MultiplayerConnectScreen, MultiplayerLobbyScreen, NetworkStatusBanner } from './ui/screens/MultiplayerScreens.js';
import { NetworkedMatchSession } from './net/NetworkedMatchSession.js';
import type { LobbyStateInfo, NetworkStatus } from './net/NetworkMatchClient.js';
import { createFrameHandler, hudHashForFaction } from './match/frameHandler.js';
import { FrontendScreen, LoadingStage, MatchSetup } from './ui/types.js';
import { MusicManager } from './audio/musicManager.js';
import { VoiceManager } from './audio/voiceManager.js';
import { MusicPlayerWidget } from './ui/components/MusicPlayerWidget.js';
import { AssetGalleryView } from './ui/AssetGalleryView.js';
import './ui/ra4-ui.css';
import './ui/ra4-hud-reconstruction.css';
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

/** Default authoritative match server. Overridable in the connect screen. */
const defaultServerUrl = ((): string => {
  if (typeof window === 'undefined') return 'ws://127.0.0.1:8080/ws';
  const override = new URLSearchParams(window.location.search).get('server');
  if (override) return override;
  return 'ws://127.0.0.1:8080/ws';
})();

const defaultPlayerName = ((): string => {
  if (typeof window === 'undefined') return 'КОМАНДИР';
  return new URLSearchParams(window.location.search).get('name') ?? 'КОМАНДИР';
})();

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RTSRenderer | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const simClientRef = useRef<SimWorkerClient | null>(null);
  const hasReceivedSnapshotRef = useRef(false);
  const [currentScreen, setCurrentScreen] = useState<FrontendScreen>(() => resolveScreen(window.location.hash));
  const [setup, setSetup] = useState<MatchSetup>(() => ({ ...defaultSetup, faction: factionByHash[window.location.hash] ?? defaultSetup.faction }));
  const [loadingStages, setLoadingStages] = useState<LoadingStage[]>([]);
  const [paused, setPaused] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(window.location.hash === '#/asset-gallery');
  // ── Multiplayer state (server-authoritative path) ────────────────────
  const netSessionRef = useRef<NetworkedMatchSession | null>(null);
  const [netStatus, setNetStatus] = useState<NetworkStatus>('DISCONNECTED');
  const [netDetail, setNetDetail] = useState<string | undefined>(undefined);
  const [lobby, setLobby] = useState<LobbyStateInfo | null>(null);
  const [ownPlayerIndex, setOwnPlayerIndex] = useState(0);
  const [netDesync, setNetDesync] = useState(false);
  const snapshot = useUIStore((state) => state.snapshot);
  const selectedEntityIds = useUIStore((state) => state.selectedEntityIds);

  const navigate = useCallback((screen: FrontendScreen, hash: string) => {
    window.location.hash = hash;
    setCurrentScreen(screen);
  }, []);

  const disposeMatch = useCallback(() => {
    inputManagerRef.current?.dispose();
    simClientRef.current?.dispose();
    rendererRef.current?.dispose();
    inputManagerRef.current = null;
    simClientRef.current = null;
    rendererRef.current = null;
    hasReceivedSnapshotRef.current = false;
    useUIStore.getState().setSnapshot(null as any);
    useUIStore.getState().setSelectedEntityIds([]);
    useUIStore.getState().setInputMode('RTS');
    useUIStore.getState().setConsoleOpen(false);
    if (typeof window !== 'undefined') {
      delete (window as any).__RA4_GAME_DOCTOR__;
    }
  }, []);

  const initializeMatch = useCallback(async (matchSetup: MatchSetup) => {
    if (!canvasRef.current) return;
    disposeMatch();
    setLoadingStages((stages) => stages.map((stage) => stage.id === 'renderer' ? { ...stage, status: 'active', progress: 28 } : stage));

    const renderer = new RTSRenderer(canvasRef.current);
    rendererRef.current = renderer;
    await renderer.ready;
    if (rendererRef.current !== renderer) return;
    // Start camera at player spawn (10,10), pulled back enough to see the base
    const spawn = DEFAULT_DATABASE.maps[0].spawnPoints[0];
    renderer.rtsCamera.setMapBounds(DEFAULT_DATABASE.maps[0].width, DEFAULT_DATABASE.maps[0].height);
    renderer.rtsCamera.focusOnPosition(spawn.x + 2, spawn.y + 2);
    renderer.rtsCamera.camera.radius = 40;
    renderer.rtsCamera.camera.beta = Math.PI / 3.5; // ~51° — shows more of the map
    setLoadingStages((stages) => stages.map((stage) => stage.id === 'renderer' ? { ...stage, status: 'complete', progress: 38 } : stage.id === 'simulation' ? { ...stage, status: 'active', progress: 50 } : stage));

    const simClient = new SimWorkerClient();
    simClientRef.current = simClient;
    useUIStore.getState().setActiveFaction(matchSetup.faction);
    useUIStore.getState().setActivePlayerIndex(0);
    useUIStore.getState().setSelectedEntityIds([]);
    await simClient.initialize({
      seed: Math.floor(Math.random() * 1_000_000),
      tickRate: matchSetup.gameSpeed === 'FAST' ? 36 : matchSetup.gameSpeed === 'SLOW' ? 24 : 30,
      startingCredits: matchSetup.startingCredits,
      players: [
        { name: 'Игрок', factionId: matchSetup.faction, type: PlayerType.HUMAN, team: 0 },
        { name: 'ИИ-Соперник', factionId: matchSetup.opponentFaction, type: matchSetup.difficulty === 'HARD' ? PlayerType.AI_HARD : matchSetup.difficulty === 'EASY' ? PlayerType.AI_EASY : PlayerType.AI_MEDIUM, team: 1 },
      ],
    });
    if (simClientRef.current !== simClient) return;
    setLoadingStages((stages) => stages.map((stage) => stage.id === 'simulation' ? { ...stage, status: 'complete', progress: 63 } : stage.id === 'input' ? { ...stage, status: 'active', progress: 72 } : stage));

    const inputManager = new InputManager(renderer, canvasRef.current, (command) => simClient.dispatchCommand(command));
    inputManagerRef.current = inputManager;
    setLoadingStages((stages) => stages.map((stage) => stage.id === 'input' ? { ...stage, status: 'complete', progress: 82 } : stage.id === 'snapshot' ? { ...stage, status: 'active', progress: 90 } : stage));

    if (typeof window !== 'undefined') {
      (window as any).__RA4_GAME_DOCTOR__ = {
        getSnapshot: () => useUIStore.getState().snapshot,
        getSelectedEntityIds: () => useUIStore.getState().selectedEntityIds,
        projectWorldToScreen: (wx: number, wz: number) => rendererRef.current?.projectWorldToScreen(wx, wz) ?? null,
        getPerformance: () => ({
          fps: renderer.engine.getFps(),
          activeMeshes: renderer.scene.getActiveMeshes().length,
          totalMeshes: renderer.scene.meshes.length,
          heap: (performance as any).memory?.usedJSHeapSize ?? 0,
        }),
        triggerVictory: () => {
          simClient.debugEliminatePlayer(1);
        },
      };
    }

    const handleFrame = createFrameHandler({
      renderer,
      onMatchFinished: (winnerTeam) => {
        simClient.stop();
        const isVictory = winnerTeam === 0;
        VoiceManager.getInstance().playEVAMessage(isVictory ? 'VICTORY' : 'DEFEAT');
        navigate(isVictory ? 'VICTORY' : 'DEFEAT', isVictory ? '#/victory' : '#/defeat');
      },
      onFirstFrame: () => {
        hasReceivedSnapshotRef.current = true;
        setLoadingStages((stages) => stages.map((stage) => ({ ...stage, status: 'complete', progress: 100 })));
        window.requestAnimationFrame(() => navigate('MATCH', hudHashForFaction(matchSetup.faction)));
      },
    });
    simClient.onFrame(handleFrame);
    simClient.start();
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
    window.requestAnimationFrame(() => { void initializeMatch(matchSetup); });
  }, [initializeMatch, navigate]);

  // ── Server-authoritative multiplayer ─────────────────────────────────

  const disposeNetSession = useCallback(() => {
    netSessionRef.current?.dispose();
    netSessionRef.current = null;
    setLobby(null);
    setNetDesync(false);
    setNetStatus('DISCONNECTED');
    setNetDetail(undefined);
  }, []);

  /**
   * Boot the renderer + input for a networked match. The simulation itself
   * is driven by the server's tick stream inside the session's Worker; the
   * client never advances a tick on its own authority.
   */
  const attachNetworkedPresentation = useCallback(async (session: NetworkedMatchSession, ownFaction: FactionId) => {
    if (!canvasRef.current) return;
    // Tear down any local-match objects, but keep the network session.
    inputManagerRef.current?.dispose();
    rendererRef.current?.dispose();
    simClientRef.current = null;
    hasReceivedSnapshotRef.current = false;

    const renderer = new RTSRenderer(canvasRef.current);
    rendererRef.current = renderer;
    await renderer.ready;
    if (rendererRef.current !== renderer) return;

    const map = DEFAULT_DATABASE.maps[0];
    const spawn = map.spawnPoints[Math.min(session.playerIndex, map.spawnPoints.length - 1)];
    renderer.rtsCamera.setMapBounds(map.width, map.height);
    renderer.rtsCamera.focusOnPosition(spawn.x + 2, spawn.y + 2);
    renderer.rtsCamera.camera.radius = 40;
    renderer.rtsCamera.camera.beta = Math.PI / 3.5;

    useUIStore.getState().setActiveFaction(ownFaction);
    useUIStore.getState().setActivePlayerIndex(session.playerIndex);
    useUIStore.getState().setSelectedEntityIds([]);

    // Input dispatches through the network session: commands go to the
    // server for validation and come back in the authoritative stream.
    const inputManager = new InputManager(renderer, canvasRef.current, (command) => session.dispatchCommand(command));
    inputManagerRef.current = inputManager;

    if (typeof window !== 'undefined') {
      (window as any).__RA4_GAME_DOCTOR__ = {
        getSnapshot: () => useUIStore.getState().snapshot,
        getSelectedEntityIds: () => useUIStore.getState().selectedEntityIds,
        projectWorldToScreen: (wx: number, wz: number) => rendererRef.current?.projectWorldToScreen(wx, wz) ?? null,
        getNetworkStatus: () => ({ status: session.net.status, tick: session.net.lastServerTick, desync: session.net.isDesynced }),
        /** QA: per-tick local checksums, for cross-client parity assertions. */
        getChecksumHistory: () => session.net.getChecksumHistory(),
        getPerformance: () => ({
          fps: renderer.engine.getFps(),
          activeMeshes: renderer.scene.getActiveMeshes().length,
          totalMeshes: renderer.scene.meshes.length,
          heap: (performance as any).memory?.usedJSHeapSize ?? 0,
        }),
      };
    }

    const handleFrame = createFrameHandler({
      renderer,
      onMatchFinished: (winnerTeam) => {
        // Authority note: the SERVER decides the outcome; this only reacts
        // to the authoritative state already applied locally.
        const ownTeam = lobby?.slots.find((s) => s.index === session.playerIndex)?.team ?? 0;
        const isVictory = winnerTeam === ownTeam;
        VoiceManager.getInstance().playEVAMessage(isVictory ? 'VICTORY' : 'DEFEAT');
        navigate(isVictory ? 'VICTORY' : 'DEFEAT', isVictory ? '#/victory' : '#/defeat');
      },
      onFirstFrame: () => {
        hasReceivedSnapshotRef.current = true;
        setLoadingStages((stages) => stages.map((stage) => ({ ...stage, status: 'complete', progress: 100 })));
        window.requestAnimationFrame(() => navigate('MATCH', hudHashForFaction(ownFaction)));
      },
    });
    session.onFrame(handleFrame);
  }, [lobby, navigate]);

  const connectToServer = useCallback((url: string, playerName: string) => {
    disposeNetSession();
    setNetStatus('CONNECTING');

    const session = new NetworkedMatchSession({
      url,
      playerName,
      onStatus: (status, detail) => { setNetStatus(status); setNetDetail(detail); },
      onLobbyState: (state) => {
        setLobby(state);
        setOwnPlayerIndex(session.playerIndex);
        if (window.location.hash !== '#/multiplayer/lobby') {
          navigate('MULTIPLAYER_LOBBY', '#/multiplayer/lobby');
        }
      },
      onMatchStart: (info) => {
        const ownSlot = info.players[session.playerIndex];
        setLoadingStages([
          { id: 'manifest', label: 'ПРОВЕРКА МАНИФЕСТА РЕСУРСОВ', progress: 12, status: 'complete' },
          { id: 'network', label: 'СИНХРОНИЗАЦИЯ С СЕРВЕРОМ МАТЧА', progress: 30, status: 'complete' },
          { id: 'renderer', label: 'BABYLON PRESENTATION LAYER', progress: 40, status: 'active' },
          { id: 'input', label: 'КОМАНДНЫЙ ПРОТОКОЛ И HUD', progress: 60, status: 'pending' },
          { id: 'snapshot', label: 'ПЕРВЫЙ АВТОРИТЕТНЫЙ ТИК', progress: 80, status: 'pending' },
        ]);
        navigate('LOADING', '#/loading');
        void attachNetworkedPresentation(session, ownSlot?.factionId ?? FactionId.USSR);
      },
      onDesync: () => setNetDesync(true),
      onGameOver: () => { /* handled through the authoritative frame path */ },
    });

    netSessionRef.current = session;
    session.connect();
  }, [attachNetworkedPresentation, disposeNetSession, navigate]);

  useEffect(() => {
    const onHashChange = () => {
      setGalleryOpen(window.location.hash === '#/asset-gallery');
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
    // Deep-link into a match (e.g. #/hud/soviet) starts a LOCAL skirmish.
    // Never do this while a networked session owns the match, or we would
    // spawn a second, non-authoritative simulation on top of it.
    if (currentScreen === 'MATCH' && !simClientRef.current && !netSessionRef.current) {
      startMatch({ ...setup, faction: factionByHash[window.location.hash] ?? setup.faction });
    }
  }, [currentScreen, setup, startMatch]);

  useEffect(() => {
    MusicManager.getInstance().handleScreenChange(currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || currentScreen !== 'MATCH') return;
      if (paused) simClientRef.current?.resume();
      else simClientRef.current?.pause();
      setPaused((value) => !value);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [currentScreen, paused]);

  useEffect(() => disposeMatch, [disposeMatch]);

  const issueCommand = (command: PlayerCommand) => {
    // In a networked match commands must go through the server for
    // validation; only a local skirmish dispatches straight to the Worker.
    if (netSessionRef.current) return netSessionRef.current.dispatchCommand(command);
    return simClientRef.current?.dispatchCommand(command);
  };
  const beginBuildingPlacement = (structureId: string) => inputManagerRef.current?.beginBuildingPlacement(structureId);
  const beginCommandMode = (mode: CommandType.MOVE | CommandType.ATTACK) => inputManagerRef.current?.beginCommandMode(mode);
  const pauseMatch = () => {
    // A networked match cannot be paused unilaterally — the server owns the
    // clock. Pausing locally would stall our tick application and desync us.
    if (netSessionRef.current) return;
    simClientRef.current?.pause();
    setPaused(true);
  };
  const resumeMatch = () => {
    simClientRef.current?.resume();
    setPaused(false);
  };
  const returnToMenu = () => {
    setPaused(false);
    if (netSessionRef.current) {
      // Leaving a live networked match is a surrender: the server records it.
      netSessionRef.current.surrender();
      disposeNetSession();
    }
    disposeMatch();
    navigate('MAIN_MENU', '#/menu');
  };

  if (galleryOpen) return <AssetGalleryView onClose={() => { window.location.hash = '#/menu'; setGalleryOpen(false); }} />;

  return (
    <div className="ra4-app-shell">
      <canvas ref={canvasRef} id="renderCanvas" className={currentScreen === 'MATCH' ? 'is-visible' : ''} />
      {currentScreen === 'SPLASH' && <SplashScreen onEnter={() => navigate('MAIN_MENU', '#/menu')} />}
      {currentScreen === 'MAIN_MENU' && <MainMenuScreen onSelect={(option) => option === 'CAMPAIGN' ? navigate('CAMPAIGN_SELECT', '#/campaign') : option === 'SKIRMISH' ? navigate('SKIRMISH_SETUP', '#/skirmish') : option === 'MULTIPLAYER' ? navigate('MULTIPLAYER_CONNECT', '#/multiplayer') : option === 'EXIT' ? navigate('SPLASH', '#/splash') : undefined} />}
      {currentScreen === 'CAMPAIGN_SELECT' && <CampaignSelectScreen onBack={() => navigate('MAIN_MENU', '#/menu')} onSelect={(faction) => { setSetup((current) => ({ ...current, faction })); navigate('FACTION_CAMPAIGN', factionCampaignHash[faction]); }} />}
      {currentScreen === 'FACTION_CAMPAIGN' && setup.faction !== FactionId.NEUTRAL && <FactionCampaignScreen faction={setup.faction} onBack={() => navigate('CAMPAIGN_SELECT', '#/campaign')} onContinue={() => setup.faction === FactionId.ALLIANCE ? navigate('COMMAND_CENTER', '#/allied-command') : setup.faction === FactionId.ORIENTAL_COALITION ? navigate('COMMAND_CENTER', '#/coalition-command') : navigate('STRATEGIC_MAP', '#/strategic-map')} />}
      {currentScreen === 'COMMAND_CENTER' && (setup.faction === FactionId.ALLIANCE || setup.faction === FactionId.ORIENTAL_COALITION) && <CommandCenterScreen faction={setup.faction} onBack={() => navigate('FACTION_CAMPAIGN', factionCampaignHash[setup.faction])} onContinue={() => navigate('STRATEGIC_MAP', '#/strategic-map')} />}
      {currentScreen === 'STRATEGIC_MAP' && <StrategicMapScreen onBack={() => navigate('CAMPAIGN_SELECT', '#/campaign')} onContinue={() => navigate('BRIEFING', '#/briefing')} />}
      {currentScreen === 'BRIEFING' && <BriefingScreen onBack={() => navigate('STRATEGIC_MAP', '#/strategic-map')} onContinue={() => navigate('TRANSMISSION', '#/transmission')} />}
      {currentScreen === 'TRANSMISSION' && <TransmissionScreen onBack={() => navigate('BRIEFING', '#/briefing')} onContinue={() => startMatch(setup)} />}
      {currentScreen === 'SKIRMISH_SETUP' && <SkirmishSetupScreen onBack={() => navigate('MAIN_MENU', '#/menu')} onStart={startMatch} />}
      {currentScreen === 'MULTIPLAYER_CONNECT' && (
        <MultiplayerConnectScreen
          defaultUrl={defaultServerUrl}
          defaultName={defaultPlayerName}
          status={netStatus}
          statusDetail={netDetail}
          onBack={() => { disposeNetSession(); navigate('MAIN_MENU', '#/menu'); }}
          onConnect={connectToServer}
        />
      )}
      {currentScreen === 'MULTIPLAYER_LOBBY' && (
        <MultiplayerLobbyScreen
          lobby={lobby}
          ownPlayerIndex={ownPlayerIndex}
          status={netStatus}
          statusDetail={netDetail}
          onBack={() => { disposeNetSession(); navigate('MAIN_MENU', '#/menu'); }}
          onSetFaction={(factionId) => netSessionRef.current?.setSlot(ownPlayerIndex, factionId)}
          onSetTeam={(team) => netSessionRef.current?.setSlot(ownPlayerIndex, undefined, undefined, team)}
          onSetReady={(isReady) => netSessionRef.current?.setReady(isReady)}
          onStartMatch={() => netSessionRef.current?.startMatch()}
        />
      )}
      {currentScreen === 'LOADING' && <LoadingScreen setup={setup} stages={loadingStages} />}
      {currentScreen === 'MATCH' && <GameplayHUD faction={setup.faction} snapshot={snapshot} selectedEntityIds={selectedEntityIds} onIssueCommand={issueCommand} onBeginBuildingPlacement={beginBuildingPlacement} onBeginCommandMode={beginCommandMode} onPause={pauseMatch} onMinimapClick={(x, y) => inputManagerRef.current?.focusCamera(x, y)} />}
      {currentScreen === 'MATCH' && netSessionRef.current && (
        <div className="ra4-net-banner-overlay">
          <NetworkStatusBanner status={netStatus} detail={netDetail} desync={netDesync} />
        </div>
      )}
      {currentScreen === 'MATCH' && paused && <PauseOverlay onResume={resumeMatch} onExit={returnToMenu} />}
      {currentScreen === 'VICTORY' && <MatchResultScreen result="victory" onMenu={returnToMenu} onRetry={() => startMatch(setup)} />}
      {currentScreen === 'DEFEAT' && <MatchResultScreen result="defeat" onMenu={returnToMenu} onRetry={() => startMatch(setup)} />}
      <AdminConsole
        onExecuteCommand={(cmd) => AdminConsoleService.getInstance().executeCommand(cmd)}
        onGetAutocomplete={(prefix) => AdminConsoleService.getInstance().getAutocompleteSuggestions(prefix)}
        onClose={() => {
          useUIStore.getState().setConsoleOpen(false);
          useUIStore.getState().setInputMode('RTS');
        }}
      />
      <MusicPlayerWidget />
    </div>
  );
};
