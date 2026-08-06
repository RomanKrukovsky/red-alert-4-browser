import React, { useState } from 'react';
import { FactionId, PlayerType } from '@ra4/shared-types';
import { DEFAULT_DATABASE } from '@ra4/content-runtime';
import { Emblem, MetalPanel, MilitaryButton, RA4Icon } from '../components/RA4Primitives.js';
import type { LobbySlotInfo, LobbyStateInfo, NetworkStatus } from '../../net/NetworkMatchClient.js';

const availableMaps = DEFAULT_DATABASE.maps.map((m) => ({ id: m.id, name: m.name, maxPlayers: m.maxPlayers }));
const mapName = (id: string): string => availableMaps.find((m) => m.id === id)?.name ?? id;

const factions = [
  { id: FactionId.USSR, label: 'СССР' },
  { id: FactionId.ALLIANCE, label: 'АЛЬЯНС' },
  { id: FactionId.ORIENTAL_COALITION, label: 'ВОСТОЧНАЯ КОАЛИЦИЯ' },
  { id: FactionId.CHRONOLEGION, label: 'ХРОНОЛЕГИОН' },
];

const factionLabel = (id: FactionId): string => factions.find((f) => f.id === id)?.label ?? String(id);

const statusLabel: Record<NetworkStatus, string> = {
  DISCONNECTED: 'НЕТ СВЯЗИ',
  CONNECTING: 'ПОДКЛЮЧЕНИЕ…',
  IN_LOBBY: 'В ЛОББИ',
  IN_MATCH: 'В БОЮ',
  RECONNECTING: 'ПЕРЕПОДКЛЮЧЕНИЕ…',
  MATCH_OVER: 'МАТЧ ЗАВЕРШЁН',
  ERROR: 'ОШИБКА СЕТИ',
};

const statusTone: Record<NetworkStatus, string> = {
  DISCONNECTED: 'is-offline',
  CONNECTING: 'is-pending',
  IN_LOBBY: 'is-online',
  IN_MATCH: 'is-online',
  RECONNECTING: 'is-pending',
  MATCH_OVER: 'is-offline',
  ERROR: 'is-error',
};

/**
 * Network connection banner. Always reflects real transport state — it is
 * never decorative. Visible in lobby and during a match (reconnect/desync).
 */
export const NetworkStatusBanner: React.FC<{
  status: NetworkStatus;
  detail?: string;
  desync?: boolean;
}> = ({ status, detail, desync }) => (
  <div className={`ra4-net-banner ${statusTone[status]}${desync ? ' is-desync' : ''}`} role="status" aria-live="polite">
    <RA4Icon name="globe" size={15} />
    <b>{statusLabel[status]}</b>
    {detail && <span>{detail}</span>}
    {desync && <strong className="ra4-net-desync">РАССИНХРОНИЗАЦИЯ — СОСТОЯНИЕ СЕРВЕРА АВТОРИТЕТНО</strong>}
  </div>
);

/** Server connection screen: pick a server URL and player name, then connect. */
export const MultiplayerConnectScreen: React.FC<{
  defaultUrl: string;
  defaultName: string;
  status: NetworkStatus;
  statusDetail?: string;
  onBack: () => void;
  onConnect: (url: string, playerName: string) => void;
}> = ({ defaultUrl, defaultName, status, statusDetail, onBack, onConnect }) => {
  const [url, setUrl] = useState(defaultUrl);
  const [name, setName] = useState(defaultName);
  const connecting = status === 'CONNECTING' || status === 'RECONNECTING';

  return (
    <main className="ra4-screen ra4-multiplayer-connect theme-soviet">
      <header>
        <h1>СЕТЕВАЯ ИГРА</h1>
        <div className="ra4-wordmark">COMMAND &amp; CONQUER <b>RED ALERT 4</b></div>
        <NetworkStatusBanner status={status} detail={statusDetail} />
      </header>

      <MetalPanel className="ra4-connect-panel" title="ПОДКЛЮЧЕНИЕ К БОЕВОЙ СЕТИ">
        <Emblem />
        <label>
          АДРЕС СЕРВЕРА
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-label="Адрес сервера"
            spellCheck={false}
          />
        </label>
        <label>
          ПОЗЫВНОЙ КОМАНДИРА
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Позывной командира"
            maxLength={24}
          />
        </label>
        <p className="ra4-connect-note">
          Матч выполняется на сервере: сервер проверяет каждую команду и является
          источником истины. Клиент воспроизводит подтверждённый поток команд.
        </p>
        <div className="ra4-connect-actions">
          <MilitaryButton icon="back" onClick={onBack}>НАЗАД</MilitaryButton>
          <MilitaryButton
            tone={connecting ? 'disabled' : 'primary'}
            icon="globe"
            onClick={() => !connecting && name.trim().length > 0 && onConnect(url.trim(), name.trim())}
          >
            {connecting ? 'ПОДКЛЮЧЕНИЕ…' : 'ПОДКЛЮЧИТЬСЯ'}
          </MilitaryButton>
        </div>
        {status === 'ERROR' && statusDetail && (
          <p className="ra4-connect-error" role="alert">{statusDetail}</p>
        )}
      </MetalPanel>
    </main>
  );
};

/**
 * Network lobby. Every control issues a real protocol message; slot data
 * comes from the server's authoritative lobby state, never local guesses.
 */
export const MultiplayerLobbyScreen: React.FC<{
  lobby: LobbyStateInfo | null;
  ownPlayerIndex: number;
  status: NetworkStatus;
  statusDetail?: string;
  onBack: () => void;
  onSetFaction: (factionId: FactionId) => void;
  onSetTeam: (team: number) => void;
  onSetReady: (isReady: boolean) => void;
  onSetMap: (mapId: string) => void;
  onStartMatch: () => void;
}> = ({ lobby, ownPlayerIndex, status, statusDetail, onBack, onSetFaction, onSetTeam, onSetReady, onSetMap, onStartMatch }) => {
  const slots: LobbySlotInfo[] = lobby?.slots ?? [];
  const own = slots.find((s) => s.index === ownPlayerIndex);
  // Only occupied human slots gate readiness; empty slots and AI never block.
  const humans = slots.filter((s) => s.type === PlayerType.HUMAN && s.isConnected);
  const readyHumans = humans.filter((s) => s.isReady);
  const isHost = lobby ? lobby.hostIndex === ownPlayerIndex : false;
  const canStart = isHost && humans.length >= 2 && readyHumans.length === humans.length;

  return (
    <main className="ra4-screen ra4-skirmish ra4-multiplayer-lobby theme-soviet">
      <header>
        <h1>СЕТЕВОЕ ЛОББИ</h1>
        <div className="ra4-wordmark">COMMAND &amp; CONQUER <b>RED ALERT 4</b></div>
        <span>{readyHumans.length} / {humans.length} ИГРОКОВ ГОТОВЫ</span>
      </header>

      <MetalPanel className="ra4-lobby-left">
        <Emblem />
        <h2>КОМНАТА</h2>
        <p className="ra4-room-code">КОД: <b>{lobby?.roomId ?? '—'}</b></p>
        <h3>КАРТА</h3>
        {isHost ? (
          <label className="ra4-lobby-map-select">
            <select
              value={lobby?.mapId ?? availableMaps[0].id}
              aria-label="Карта матча"
              onChange={(event) => onSetMap(event.target.value)}
            >
              {availableMaps.map((m) => (
                <option value={m.id} key={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <p>{lobby ? mapName(lobby.mapId) : '—'}</p>
        )}
        <h3>ПОБЕДНЫЕ УСЛОВИЯ</h3>
        <p>УНИЧТОЖИТЬ ВСЕХ ПРОТИВНИКОВ</p>
        <NetworkStatusBanner status={status} detail={statusDetail} />
        <MilitaryButton icon="back" onClick={onBack}>ПОКИНУТЬ ЛОББИ</MilitaryButton>
      </MetalPanel>

      <MetalPanel className="ra4-lobby-roster">
        <div className="ra4-roster-header">
          <span>#</span><span>ИГРОК</span><span>ФРАКЦИЯ</span><span>ЦВЕТ</span><span>КОМАНДА</span><span>ГОТОВНОСТЬ</span>
        </div>
        {slots.length === 0 && (
          <div className="ra4-roster-row is-empty">
            <span>—</span><b>ОЖИДАНИЕ СОСТОЯНИЯ ЛОББИ…</b><span>—</span><i /><span>—</span><span>—</span>
          </div>
        )}
        {slots.map((slot) => {
          const isOwn = slot.index === ownPlayerIndex;
          const isAI = slot.type !== PlayerType.HUMAN;
          return (
            <div className={`ra4-roster-row${isOwn ? ' is-own' : ''}${!slot.isConnected && !isAI ? ' is-empty' : ''}`} key={slot.index}>
              <span>{slot.index + 1}</span>
              <b>{isAI ? `ИИ — ${slot.name}` : slot.isConnected ? slot.name : 'СВОБОДНО'}{isOwn && ' (ВЫ)'}</b>
              {isOwn ? (
                <select
                  value={slot.factionId}
                  aria-label="Ваша фракция"
                  onChange={(event) => onSetFaction(event.target.value as FactionId)}
                >
                  {factions.map((f) => <option value={f.id} key={f.id}>{f.label}</option>)}
                </select>
              ) : (
                <span>{slot.isConnected || isAI ? factionLabel(slot.factionId) : '—'}</span>
              )}
              <i style={{ background: slot.isConnected || isAI ? (slot as LobbySlotInfo & { color?: string }).color ?? '#888' : undefined }} />
              {isOwn ? (
                <select
                  value={slot.team}
                  aria-label="Ваша команда"
                  onChange={(event) => onSetTeam(Number(event.target.value))}
                >
                  <option value={0}>1</option>
                  <option value={1}>2</option>
                </select>
              ) : (
                <span>{slot.isConnected || isAI ? slot.team + 1 : '—'}</span>
              )}
              <span className={slot.isReady ? 'ra4-ready is-ready' : 'ra4-ready'}>
                {isAI ? '● ГОТОВ' : slot.isConnected ? (slot.isReady ? '● ГОТОВ' : '○ НЕ ГОТОВ') : '—'}
              </span>
            </div>
          );
        })}
      </MetalPanel>

      <MetalPanel className="ra4-lobby-right" title="СТАТУС">
        <h2>{lobby ? mapName(lobby.mapId) : 'КАРТА НЕ ВЫБРАНА'}</h2>
        <div className="ra4-map-preview"><span className="start-one">1</span><span className="start-two">2</span></div>
        <p>ВАША ФРАКЦИЯ: <b>{own ? factionLabel(own.factionId) : '—'}</b></p>
        <p>ВАША КОМАНДА: <b>{own ? own.team + 1 : '—'}</b></p>
        <p>РОЛЬ: <b>{isHost ? 'ХОСТ' : 'УЧАСТНИК'}</b></p>
        <p className="ra4-connect-note">
          Симуляция выполняется на сервере. Ваш клиент воспроизводит
          подтверждённый поток команд и сверяет контрольные суммы.
        </p>
      </MetalPanel>

      <div className="ra4-lobby-actions">
        <MilitaryButton
          tone={own?.isReady ? 'quiet' : 'primary'}
          icon="star"
          onClick={() => onSetReady(!own?.isReady)}
        >
          {own?.isReady ? 'ОТМЕНИТЬ ГОТОВНОСТЬ' : 'ГОТОВ К БОЮ'}
        </MilitaryButton>
        <MilitaryButton
          tone={canStart ? 'primary' : 'disabled'}
          icon="play"
          className={canStart ? 'ra4-glow-pulse' : undefined}
          onClick={() => canStart && onStartMatch()}
        >
          {isHost ? 'НАЧАТЬ БИТВУ' : 'ОЖИДАНИЕ ХОСТА'}
        </MilitaryButton>
      </div>
    </main>
  );
};
