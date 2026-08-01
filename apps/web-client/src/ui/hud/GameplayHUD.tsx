import React, { useMemo, useState } from 'react';
import { OFFICIAL_BUILDINGS, OFFICIAL_UNITS } from '@ra4/content-runtime';
import { CommandType, FactionId, PlayerCommand, WorldSnapshot } from '@ra4/shared-types';
import { MetalPanel, MilitaryButton, RA4Icon, Resource } from '../components/RA4Primitives.js';
import { FactionTheme, factionThemeById } from '../types.js';
import { createGameplayHUDViewModel, formatResource } from '../view-models/gameplayHUDViewModel.js';

type ProductionTab = 'BUILDINGS' | 'INFANTRY' | 'VEHICLES' | 'AIR' | 'NAVAL';

interface GameplayHUDProps {
  faction: FactionId;
  snapshot: WorldSnapshot | null;
  selectedEntityIds: number[];
  onIssueCommand: (command: PlayerCommand) => void;
  onPause: () => void;
}

const tabLabels: Record<ProductionTab, string> = {
  BUILDINGS: 'СТРОИТЬ',
  INFANTRY: 'ПЕХОТА',
  VEHICLES: 'ТЕХНИКА',
  AIR: 'АВИАЦИЯ',
  NAVAL: 'ФЛОТ',
};

const factionNames: Record<FactionTheme, string> = {
  soviet: 'СОВЕТСКИЙ СОЮЗ',
  allies: 'АЛЬЯНС',
  coalition: 'ВОСТОЧНАЯ КОАЛИЦИЯ',
  chronolegion: 'ХРОНОЛЕГИОН',
};

export const GameplayHUD: React.FC<GameplayHUDProps> = ({ faction, snapshot, selectedEntityIds, onIssueCommand, onPause }) => {
  const theme = factionThemeById[faction];
  const [activeTab, setActiveTab] = useState<ProductionTab>(faction === FactionId.ALLIANCE ? 'AIR' : 'BUILDINGS');
  const viewModel = useMemo(() => createGameplayHUDViewModel(snapshot, selectedEntityIds), [selectedEntityIds, snapshot]);
  const products = useMemo(() => {
    if (activeTab === 'BUILDINGS') return OFFICIAL_BUILDINGS.filter((item) => item.factionId === faction).slice(0, 8);
    return OFFICIAL_UNITS.filter((item) => item.factionId === faction).slice(0, 12);
  }, [activeTab, faction]);

  const issueStop = () => {
    if (!viewModel.selected) return;
    onIssueCommand({ type: CommandType.STOP, entityIds: [viewModel.selected.id], playerIndex: 0, tick: viewModel.tick + 1 });
  };

  const issueProduction = (specId: string) => {
    if (viewModel.producerEntityId === null || activeTab === 'BUILDINGS') return;
    onIssueCommand({ type: CommandType.PRODUCE_UNIT, entityIds: [viewModel.producerEntityId], playerIndex: 0, tick: viewModel.tick + 1, producerEntityId: viewModel.producerEntityId, unitId: specId });
  };

  return (
    <div className={`ra4-gameplay-hud theme-${theme}`}>
      <MetalPanel className="ra4-commander-chip"><div className="ra4-commander-avatar" /><div><b>{theme === 'allies' ? 'ПРЕЗИДЕНТ ЭЛЕАНОР УОРД' : theme === 'chronolegion' ? 'ГЛАВНОКОМАНДУЮЩИЙ АЛЕКСЕЙ' : 'ТОВАРИЩ КОМАНДИР'}</b><span>{factionNames[theme]}</span></div></MetalPanel>
      <MetalPanel className="ra4-resource-bar">
        <Resource icon="credits" value={formatResource(viewModel.credits)} label="Кредиты" />
        <Resource icon="power" value={`${viewModel.powerConsumed} / ${viewModel.powerProduced}`} warning={viewModel.powerLow} label="Энергия" />
        <Resource icon="star" value={Math.round(viewModel.factionResource).toString()} label="Ресурс фракции" />
        <Resource icon="cap" value={`${viewModel.commandCapUsed} / ${viewModel.commandCapMax}`} label="Командный лимит" />
        <button className="ra4-icon-button" onClick={onPause} aria-label="Открыть меню"><span /><span /><span /></button>
      </MetalPanel>
      <MetalPanel className="ra4-objectives-panel" title="ОСНОВНЫЕ ЗАДАЧИ"><label><i /> Уничтожить базу противника</label><label><i /> Захватить хранилище ресурсов</label><h4>ДОПОЛНИТЕЛЬНЫЕ ЗАДАЧИ</h4><label><i /> Сохранить командный центр</label></MetalPanel>
      <div className="ra4-alert-stack"><div><RA4Icon name="star" size={18} /><span>БОЕВАЯ ОБСТАНОВКА<br /><small>Обнаружены силы противника</small></span></div></div>
      <MetalPanel className="ra4-minimap-shell">
        <canvas width="300" height="220" aria-label="Тактическая миникарта" />
        <div className="ra4-minimap-terrain"><i /><i /><i /><i /><i /><b /></div>
        <div className="ra4-minimap-controls">{['target', 'shield', 'repair', 'star'].map((icon) => <button key={icon} aria-label="Режим миникарты"><RA4Icon name={icon as 'target'} size={16} /></button>)}</div>
      </MetalPanel>
      <MetalPanel className="ra4-production-shell">
        <nav>{(Object.keys(tabLabels) as ProductionTab[]).map((tab) => <button className={activeTab === tab ? 'is-active' : ''} key={tab} onClick={() => setActiveTab(tab)}>{tabLabels[tab]}</button>)}</nav>
        <div className="ra4-production-section"><header><span>{activeTab === 'BUILDINGS' ? 'ЗДАНИЯ' : tabLabels[activeTab]}</span><small>ТЕХНОЛОГИЧЕСКИЙ УРОВЕНЬ {viewModel.techTier}</small></header><div className="ra4-production-grid">{products.map((product, index) => {
          const affordable = viewModel.credits >= product.cost;
          return <button key={product.id} className={`${affordable ? '' : 'is-disabled'}${index === 1 ? ' is-ready' : ''}`} onClick={() => affordable && issueProduction(product.id)} disabled={!affordable}><div className="ra4-unit-silhouette" /><b>{product.name}</b><span><RA4Icon name="credits" size={12} />{product.cost}</span>{index === 1 && <em>ГОТОВО</em>}</button>;
        })}</div></div>
        <div className="ra4-production-tools">{['repair', 'sell', 'shield', 'power', 'target'].map((icon) => <button key={icon}><RA4Icon name={icon as 'repair'} size={18} /></button>)}</div>
      </MetalPanel>
      <MetalPanel className="ra4-selection-card">
        <div className="ra4-selected-render"><div className="ra4-unit-silhouette" /></div><div className="ra4-selection-copy"><h3>{viewModel.selected?.specId ?? 'КОМАНДНЫЙ ЦЕНТР'}</h3><span>{viewModel.selected?.isBuilding ? 'ЗДАНИЕ УПРАВЛЕНИЯ' : 'БОЕВАЯ ЕДИНИЦА'}</span><progress value={viewModel.selected?.hp ?? 2500} max={viewModel.selected?.maxHp ?? 2500} /><b>{viewModel.selected?.hp ?? 2500} / {viewModel.selected?.maxHp ?? 2500}</b><p>{viewModel.selected?.isDisabled ? 'СИСТЕМЫ ОТКЛЮЧЕНЫ' : viewModel.selected?.hasMoveTarget ? 'ВЫПОЛНЯЕТ ПРИКАЗ' : 'ОЖИДАЕТ ПРИКАЗОВ'}</p></div><div className="ra4-selection-emblem"><RA4Icon name="star" size={54} /></div>
      </MetalPanel>
      <MetalPanel className="ra4-queue-panel" title="ОЧЕРЕДЬ ПРОИЗВОДСТВА">{viewModel.queue.length > 0 ? viewModel.queue.map((item, index) => <div className="ra4-queue-row" key={item.id}><b>{index + 1}</b><span>{item.specId}<progress value={item.progressTicks} max={item.totalTicks} /></span><small>{Math.ceil((item.totalTicks - item.progressTicks) / 30)} с</small><button aria-label="Отменить">×</button></div>) : <div className="ra4-queue-empty"><span /><p>ОЧЕРЕДЬ СВОБОДНА</p></div>}</MetalPanel>
      <MetalPanel className="ra4-command-panel">{[
        { icon: 'back', label: 'ДВИЖЕНИЕ' }, { icon: 'target', label: 'АТАКА' }, { icon: 'shield', label: 'ОХРАНА' }, { icon: 'stop', label: 'СТОП', action: issueStop }, { icon: 'repair', label: 'РЕМОНТ' }, { icon: 'star', label: 'СПОСОБНОСТЬ' },
      ].map((command) => <button key={command.label} onClick={command.action} aria-label={command.label}><RA4Icon name={command.icon as 'target'} size={22} /><kbd>{command.label[0]}</kbd></button>)}</MetalPanel>
      <div className="ra4-match-time">ЭНЕРГИЯ: {viewModel.powerProduced - viewModel.powerConsumed} <progress value={viewModel.powerProduced - viewModel.powerConsumed} max={viewModel.powerProduced} /><span>ВРЕМЯ: {viewModel.elapsed}</span></div>
    </div>
  );
};

export const PauseOverlay: React.FC<{ onResume: () => void; onExit: () => void }> = ({ onResume, onExit }) => (
  <div className="ra4-pause-overlay theme-soviet" role="dialog" aria-modal="true" aria-label="Пауза"><MetalPanel title="ИГРА ПРИОСТАНОВЛЕНА"><h2>ПАУЗА</h2><MilitaryButton tone="primary" onClick={onResume}>ВЕРНУТЬСЯ В ИГРУ</MilitaryButton><MilitaryButton>НАСТРОЙКИ</MilitaryButton><MilitaryButton icon="exit" onClick={onExit}>ВЫЙТИ В МЕНЮ</MilitaryButton></MetalPanel></div>
);
