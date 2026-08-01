import React, { useMemo, useState } from 'react';
import { FactionId } from '@ra4/shared-types';
import { Emblem, MetalPanel, MilitaryButton, RA4Icon } from '../components/RA4Primitives.js';
import { LoadingStage, MatchSetup } from '../types.js';

const factions = [
  { id: FactionId.USSR, label: 'СССР' },
  { id: FactionId.ALLIANCE, label: 'АЛЬЯНС' },
  { id: FactionId.ORIENTAL_COALITION, label: 'ВОСТОЧНАЯ КОАЛИЦИЯ' },
  { id: FactionId.CHRONOLEGION, label: 'ХРОНОЛЕГИОН' },
];

const maps = ['АЛЯСКА — ХОЛОДНАЯ ВЕРШИНА', 'КИЕВ — КРАСНЫЙ РУБЕЖ', 'ОСТРОВА — СИНЯЯ БУРЯ'];

export const SkirmishSetupScreen: React.FC<{ onBack: () => void; onStart: (setup: MatchSetup) => void }> = ({ onBack, onStart }) => {
  const [faction, setFaction] = useState(FactionId.USSR);
  const [opponent, setOpponent] = useState(FactionId.ALLIANCE);
  const [difficulty, setDifficulty] = useState<MatchSetup['difficulty']>('NORMAL');
  const [credits, setCredits] = useState(10000);
  const [gameSpeed, setGameSpeed] = useState<MatchSetup['gameSpeed']>('NORMAL');
  const [mapName, setMapName] = useState(maps[0]);
  const participants = useMemo(() => [
    { name: 'SOKOLOV_1945', faction, color: '#bd241d', team: 1, human: true },
    { name: `ИИ — ${difficulty}`, faction: opponent, color: '#245eac', team: 2, human: false },
  ], [difficulty, faction, opponent]);

  const labelForFaction = (id: FactionId) => factions.find((item) => item.id === id)?.label ?? id;

  return (
    <main className="ra4-screen ra4-skirmish theme-soviet">
      <header><h1>НАСТРОЙКА СХВАТКИ</h1><div className="ra4-wordmark">COMMAND &amp; CONQUER <b>RED ALERT 4</b></div><span>2 / 2 ИГРОКОВ ГОТОВЫ</span></header>
      <MetalPanel className="ra4-lobby-left">
        <Emblem /><h2>СХВАТКА</h2><label>КАРТА<select value={mapName} onChange={(event) => setMapName(event.target.value)}>{maps.map((map) => <option key={map}>{map}</option>)}</select></label>
        <h3>ПОБЕДНЫЕ УСЛОВИЯ</h3><p>УНИЧТОЖИТЬ ВСЕХ ПРОТИВНИКОВ</p>
        <div className="ra4-settings-list"><span>ДРУЖЕСКИЙ ОГОНЬ <b>ВЫКЛ.</b></span><span>ОГРАНИЧЕНИЕ ВРЕМЕНИ <b>НЕТ</b></span><span>СУПЕРОРУЖИЕ <b>ВКЛ.</b></span></div>
        <MilitaryButton icon="back" onClick={onBack}>ПОКИНУТЬ ЛОББИ</MilitaryButton>
      </MetalPanel>
      <MetalPanel className="ra4-lobby-roster">
        <div className="ra4-roster-header"><span>#</span><span>ИГРОК</span><span>ФРАКЦИЯ</span><span>ЦВЕТ</span><span>КОМАНДА</span><span>ГОТОВНОСТЬ</span></div>
        {participants.map((player, index) => (
          <div className="ra4-roster-row" key={player.name}>
            <span>{index + 1}</span><b>{player.name}</b>
            <select value={player.faction} onChange={(event) => player.human ? setFaction(event.target.value as FactionId) : setOpponent(event.target.value as FactionId)}>{factions.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select>
            <i style={{ background: player.color }} /><span>{player.team}</span><span className="ra4-ready">○ ГОТОВ</span>
          </div>
        ))}
        {[3, 4, 5, 6, 7, 8].map((slot) => <div className="ra4-roster-row is-empty" key={slot}><span>{slot}</span><b>ЗАКРЫТО</b><span>—</span><i /><span>—</span><span>—</span></div>)}
        <div className="ra4-lobby-chat"><p><b>SOKOLOV_1945:</b> За Родину!</p><p><b>БОЕВАЯ СЕТЬ:</b> Настройки синхронизированы.</p><input aria-label="Сообщение" placeholder="НАПИСАТЬ СООБЩЕНИЕ…" /></div>
      </MetalPanel>
      <MetalPanel className="ra4-lobby-right" title="КАРТА">
        <h2>{mapName}</h2><div className="ra4-map-preview"><span className="start-one">1</span><span className="start-two">2</span></div>
        <div className="ra4-settings-form"><label>СЛОЖНОСТЬ<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as MatchSetup['difficulty'])}><option value="EASY">ЛЕГКО</option><option value="NORMAL">НОРМАЛЬНО</option><option value="HARD">ВЕТЕРАН</option></select></label><label>НАЧАЛЬНЫЕ РЕСУРСЫ<select value={credits} onChange={(event) => setCredits(Number(event.target.value))}><option value="5000">5 000</option><option value="10000">10 000</option><option value="20000">20 000</option></select></label><label>СКОРОСТЬ ИГРЫ<select value={gameSpeed} onChange={(event) => setGameSpeed(event.target.value as MatchSetup['gameSpeed'])}><option value="SLOW">НИЗКАЯ</option><option value="NORMAL">НОРМАЛЬНАЯ</option><option value="FAST">ВЫСОКАЯ</option></select></label></div>
        <p>ИГРОК: <b>{labelForFaction(faction)}</b></p><p>ПРОТИВНИК: <b>{labelForFaction(opponent)}</b></p>
      </MetalPanel>
      <div className="ra4-lobby-actions"><MilitaryButton tone="primary" icon="play" className="ra4-glow-pulse" onClick={() => onStart({ faction, opponentFaction: opponent, mapName, difficulty, startingCredits: credits, gameSpeed })}>НАЧАТЬ БИТВУ</MilitaryButton></div>
    </main>
  );
};

export const LoadingScreen: React.FC<{ setup: MatchSetup; stages: LoadingStage[] }> = ({ setup, stages }) => {
  const progress = Math.max(0, Math.min(100, stages.reduce((max, stage) => Math.max(max, stage.progress), 0)));
  const currentStage = stages.find((stage) => stage.status === 'active') ?? stages.at(-1);
  return (
    <main className="ra4-screen ra4-loading theme-soviet ra4-scanline-overlay">
      <div className="ra4-loading-sky" /><div className="ra4-loading-city" /><div className="ra4-loading-aircraft" />
      <header><div className="ra4-wordmark">COMMAND &amp; CONQUER <b>RED ALERT 4</b></div><div><h1>ЗАГРУЗКА МИССИИ</h1><span>{setup.mapName}</span></div><Emblem compact /></header>
      <MetalPanel className="ra4-loading-summary" title="СВОДКА"><p>Противник укрепил позиции. Разверните базу, обеспечьте энергоснабжение и уничтожьте командный центр вражеской армии.</p><h3>ЦЕЛИ</h3>{['Развернуть командный центр', 'Установить контроль над ресурсами', 'Уничтожить базу противника'].map((goal) => <span key={goal}><RA4Icon name="star" size={15} />{goal}</span>)}</MetalPanel>
      <div className="ra4-loading-emblem"><Emblem /></div>
      <section className="ra4-loading-progress" aria-live="polite"><div className="ra4-progress-track ra4-segmented-bar"><div className="ra4-segmented-bar-fill" style={{ width: `${progress}%` }} /></div><b>{Math.round(progress)}%</b><p>{currentStage?.label ?? 'ПОДГОТОВКА КОМАНДНОЙ СЕТИ'}</p><div className="ra4-stage-list">{stages.map((stage) => <span className={`is-${stage.status}`} key={stage.id}>{stage.label}</span>)}</div></section>
      <footer><b>ПОДСКАЗКА:</b> Инженеры могут захватывать нейтральные и вражеские здания.</footer>
    </main>
  );
};

