import React, { useEffect, useMemo, useRef, useState } from 'react';
import { OFFICIAL_BUILDINGS, OFFICIAL_UNITS } from '@ra4/content-runtime';
import { CommandType, FactionId, PlayerCommand, UnitCategory, WorldSnapshot } from '@ra4/shared-types';
import { MetalPanel, MilitaryButton, RA4Icon, Resource } from '../components/RA4Primitives.js';
import { FactionTheme, factionThemeById } from '../types.js';
import { createGameplayHUDViewModel, formatResource } from '../view-models/gameplayHUDViewModel.js';

type ProductionTab = 'BUILDINGS' | 'INFANTRY' | 'VEHICLES' | 'AIR' | 'NAVAL';

interface GameplayHUDProps {
  faction: FactionId;
  snapshot: WorldSnapshot | null;
  selectedEntityIds: number[];
  onIssueCommand: (command: PlayerCommand) => void;
  onBeginBuildingPlacement: (structureId: string) => void;
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

const unitCategoryByTab: Record<Exclude<ProductionTab, 'BUILDINGS'>, UnitCategory> = {
  INFANTRY: UnitCategory.Infantry,
  VEHICLES: UnitCategory.Vehicle,
  AIR: UnitCategory.Aircraft,
  NAVAL: UnitCategory.Naval,
};

const ProductVisual: React.FC<{ kind: ProductionTab; variant: number }> = ({ kind, variant }) => (
  <div className={`ra4-product-visual is-${kind.toLowerCase()} variant-${variant % 4}`} aria-hidden="true">
    <i className="ra4-product-body" />
    <i className="ra4-product-detail" />
    <i className="ra4-product-shadow" />
  </div>
);

const minimapModes = [
  { icon: 'target', label: 'Цели на миникарте' },
  { icon: 'shield', label: 'Оборона на миникарте' },
  { icon: 'repair', label: 'Ремонт на миникарте' },
  { icon: 'star', label: 'Особые цели на миникарте' },
] as const;

const productionTools = [
  { icon: 'repair', label: 'Ремонт' },
  { icon: 'sell', label: 'Продажа' },
  { icon: 'shield', label: 'Оборона' },
  { icon: 'power', label: 'Энергия' },
  { icon: 'target', label: 'Точка сбора' },
] as const;

export const GameplayHUD: React.FC<GameplayHUDProps> = ({ faction, snapshot, selectedEntityIds, onIssueCommand, onBeginBuildingPlacement, onPause }) => {
  const theme = factionThemeById[faction];
  const [activeTab, setActiveTab] = useState<ProductionTab>(faction === FactionId.ALLIANCE ? 'AIR' : 'BUILDINGS');
  const [objectivesOpen, setObjectivesOpen] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const producerCategory = activeTab === 'BUILDINGS' ? undefined : unitCategoryByTab[activeTab];
  const viewModel = useMemo(() => createGameplayHUDViewModel(snapshot, selectedEntityIds, producerCategory), [producerCategory, selectedEntityIds, snapshot]);
  const products = useMemo(() => {
    if (activeTab === 'BUILDINGS') return OFFICIAL_BUILDINGS.filter((item) => item.factionId === faction).slice(0, 8);
    return OFFICIAL_UNITS.filter((item) => item.factionId === faction && item.category === unitCategoryByTab[activeTab]).slice(0, 12);
  }, [activeTab, faction]);
  const selectedDisplayName = useMemo(() => {
    if (!viewModel.selected) return 'Командный центр';
    return [...OFFICIAL_BUILDINGS, ...OFFICIAL_UNITS].find((item) => item.id === viewModel.selected?.specId)?.name ?? viewModel.selected.specId;
  }, [viewModel.selected]);

  const selectTabByKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const tabs = Object.keys(tabLabels) as ProductionTab[];
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(tabs[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  };

  const issueStop = () => {
    if (!viewModel.selected) return;
    onIssueCommand({ type: CommandType.STOP, entityIds: [viewModel.selected.id], playerIndex: 0, tick: viewModel.tick + 1 });
  };

  const issueProduction = (specId: string) => {
    if (viewModel.producerEntityId === null || activeTab === 'BUILDINGS') return;
    onIssueCommand({ type: CommandType.PRODUCE_UNIT, entityIds: [viewModel.producerEntityId], playerIndex: 0, tick: viewModel.tick + 1, producerEntityId: viewModel.producerEntityId, unitId: specId });
  };

  return (
    <main className={`ra4-gameplay-hud theme-${theme}`} aria-label="Поле боя">
      <MetalPanel className="ra4-commander-chip"><div className="ra4-commander-avatar"><span /></div><div><b>{theme === 'allies' ? 'ПРЕЗИДЕНТ ЭЛЕАНОР УОРД' : theme === 'chronolegion' ? 'ХРОНОЛЕГИОН ИОН' : theme === 'coalition' ? 'СТРАТЕГ ЛИНЬ ВЭЙ' : 'ТОВАРИЩ КОМАНДИР'}</b><span>{factionNames[theme]}</span></div><RA4Icon name="star" size={25} /></MetalPanel>
      <MetalPanel className="ra4-resource-bar">
        <Resource icon="credits" value={formatResource(viewModel.credits)} label="Кредиты" />
        <Resource icon="power" value={`${viewModel.powerConsumed} / ${viewModel.powerProduced}`} warning={viewModel.powerLow} label="Энергия" />
        <Resource icon="star" value={Math.round(viewModel.factionResource).toString()} label="Ресурс фракции" />
        <Resource icon="cap" value={`${viewModel.commandCapUsed} / ${viewModel.commandCapMax}`} label="Командный лимит" />
        <button className="ra4-icon-button" onClick={onPause} aria-label="Открыть меню"><span /><span /><span /></button>
      </MetalPanel>
      <button className="ra4-objectives-toggle" aria-expanded={objectivesOpen} aria-controls="gameplay-objectives" onClick={() => setObjectivesOpen((open) => !open)}>ЗАДАЧИ</button>
      <MetalPanel id="gameplay-objectives" className={`ra4-objectives-panel${objectivesOpen ? ' is-open' : ''}`} title="ОСНОВНЫЕ ЗАДАЧИ"><div><i aria-hidden="true" /> Уничтожить базу противника</div><div><i aria-hidden="true" /> Захватить хранилище ресурсов</div><h4>ДОПОЛНИТЕЛЬНЫЕ ЗАДАЧИ</h4><div><i aria-hidden="true" /> Сохранить командный центр</div></MetalPanel>
      <div className="ra4-alert-stack" role="status"><div><RA4Icon name="star" size={18} /><span>БОЕВАЯ ОБСТАНОВКА<br /><small>Обнаружены силы противника</small></span></div></div>
      <MetalPanel className="ra4-minimap-shell">
        <canvas width="300" height="220" aria-label="Тактическая миникарта" />
        <div className="ra4-minimap-terrain"><span className="ra4-minimap-road road-one" /><span className="ra4-minimap-road road-two" />{Array.from({ length: 18 }, (_, index) => <i key={index} />)}<b /></div>
        <div className="ra4-minimap-controls">{minimapModes.map(({ icon, label }) => <button key={icon} aria-label={`${label} — пока недоступно`} title={`${label} — пока недоступно`} disabled><RA4Icon name={icon} size={16} /></button>)}</div>
      </MetalPanel>
      <MetalPanel className="ra4-production-shell">
        <nav aria-label="Категории производства" role="tablist">{(Object.keys(tabLabels) as ProductionTab[]).map((tab, index) => <button ref={(element) => { tabRefs.current[index] = element; }} className={activeTab === tab ? 'is-active' : ''} key={tab} role="tab" aria-selected={activeTab === tab} tabIndex={activeTab === tab ? 0 : -1} onKeyDown={(event) => selectTabByKeyboard(event, index)} onClick={() => setActiveTab(tab)}>{tabLabels[tab]}</button>)}</nav>
        <div className="ra4-production-section"><header><span>{activeTab === 'BUILDINGS' ? 'ЗДАНИЯ' : tabLabels[activeTab]}</span><small>ТЕХНОЛОГИЧЕСКИЙ УРОВЕНЬ {viewModel.techTier}</small></header><div className="ra4-production-grid">{products.map((product, index) => {
          const affordable = viewModel.credits >= product.cost;
          const ownedSpecIds = new Set(snapshot?.entities.filter((entity) => entity.playerIndex === 0).map((entity) => entity.specId) ?? []);
          const prerequisitesMet = product.prerequisites.every((id) => ownedSpecIds.has(id));
          const canBuild = affordable && prerequisitesMet;
          const canProduce = affordable && activeTab !== 'BUILDINGS' && viewModel.producerEntityId !== null;
          const unavailableReason = activeTab === 'BUILDINGS'
            ? !affordable ? 'Недостаточно кредитов' : !prerequisitesMet ? 'Сначала постройте необходимые здания' : ''
            : viewModel.producerEntityId === null ? 'Нет производящего здания' : !affordable ? 'Недостаточно кредитов' : '';
          const available = activeTab === 'BUILDINGS' ? canBuild : canProduce;
          return <button key={product.id} className={`${available ? '' : 'is-disabled'}${available && index === 1 ? ' is-ready' : ''}`} aria-label={`${product.name}, ${product.cost} кредитов${available ? '' : `. ${unavailableReason}`}`} title={available ? product.name : unavailableReason} onClick={() => activeTab === 'BUILDINGS' ? canBuild && onBeginBuildingPlacement(product.id) : canProduce && issueProduction(product.id)} disabled={!available}><ProductVisual kind={activeTab} variant={index} /><b>{product.name}</b><span><RA4Icon name="credits" size={12} />{product.cost}</span>{available && index === 1 && <em>ГОТОВО</em>}</button>;
        })}{products.length === 0 && <div className="ra4-production-empty"><RA4Icon name="gear" size={28} /><span>НЕТ ДОСТУПНЫХ ПРОЕКТОВ</span></div>}</div></div>
        <div className="ra4-production-tools">{productionTools.map(({ icon, label }) => <button key={icon} aria-label={`${label} — пока недоступно`} title={`${label} — пока недоступно`} disabled><RA4Icon name={icon} size={18} /></button>)}</div>
      </MetalPanel>
      <MetalPanel className="ra4-selection-card">
        <div className="ra4-selected-render"><ProductVisual kind={viewModel.selected?.isBuilding === false ? 'VEHICLES' : 'BUILDINGS'} variant={2} /></div><div className="ra4-selection-copy"><h3 title={selectedDisplayName}>{selectedDisplayName}</h3><span>{viewModel.selected?.isBuilding ? 'ЗДАНИЕ УПРАВЛЕНИЯ' : 'БОЕВАЯ ЕДИНИЦА'}</span><progress aria-label="Прочность" value={viewModel.selected?.hp ?? 2500} max={viewModel.selected?.maxHp ?? 2500} /><b>{viewModel.selected?.hp ?? 2500} / {viewModel.selected?.maxHp ?? 2500}</b><p>{viewModel.selected?.isDisabled ? 'СИСТЕМЫ ОТКЛЮЧЕНЫ' : viewModel.selected?.hasMoveTarget ? 'ВЫПОЛНЯЕТ ПРИКАЗ' : 'ОЖИДАЕТ ПРИКАЗОВ'}</p></div><div className="ra4-selection-emblem"><RA4Icon name="star" size={54} /></div>
      </MetalPanel>
      <MetalPanel className="ra4-queue-panel" title="ОЧЕРЕДЬ ПРОИЗВОДСТВА">{viewModel.queue.length > 0 ? viewModel.queue.map((item, index) => <div className="ra4-queue-row" key={item.id}><b>{index + 1}</b><span>{item.specId}<progress value={item.progressTicks} max={item.totalTicks} /></span><small>{Math.ceil((item.totalTicks - item.progressTicks) / 30)} с</small><button aria-label="Отменить">×</button></div>) : <div className="ra4-queue-empty"><span /><p>ОЧЕРЕДЬ СВОБОДНА</p></div>}</MetalPanel>
      <MetalPanel className="ra4-command-panel">{[
        { icon: 'back', label: 'ДВИЖЕНИЕ' }, { icon: 'target', label: 'АТАКА' }, { icon: 'shield', label: 'ОХРАНА' }, { icon: 'stop', label: 'СТОП', action: issueStop }, { icon: 'repair', label: 'РЕМОНТ' }, { icon: 'star', label: 'СПОСОБНОСТЬ' },
      ].map((command) => { const available = Boolean(command.action && viewModel.selected); return <button key={command.label} onClick={command.action} disabled={!available} title={available ? command.label : `${command.label} — пока недоступно`} aria-label={available ? command.label : `${command.label} — пока недоступно`}><RA4Icon name={command.icon as 'target'} size={22} /><kbd>{command.label[0]}</kbd></button>; })}</MetalPanel>
      <div className="ra4-match-time">ЭНЕРГИЯ: {viewModel.powerProduced - viewModel.powerConsumed} <progress value={viewModel.powerProduced - viewModel.powerConsumed} max={viewModel.powerProduced} /><span>ВРЕМЯ: {viewModel.elapsed}</span></div>
    </main>
  );
};

export const PauseOverlay: React.FC<{ onResume: () => void; onExit: () => void }> = ({ onResume, onExit }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const obscured = [document.querySelector<HTMLElement>('.ra4-gameplay-hud'), document.getElementById('renderCanvas')].filter((element): element is HTMLElement => Boolean(element));
    obscured.forEach((element) => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });
    dialogRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      if (controls.length === 0) return;
      const nextIndex = event.shiftKey ? (controls.indexOf(document.activeElement as HTMLButtonElement) - 1 + controls.length) % controls.length : (controls.indexOf(document.activeElement as HTMLButtonElement) + 1) % controls.length;
      event.preventDefault();
      controls[nextIndex].focus();
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.removeEventListener('keydown', trapFocus);
      obscured.forEach((element) => { element.inert = false; element.removeAttribute('aria-hidden'); });
      priorFocus?.focus();
    };
  }, []);

  return <div ref={dialogRef} className="ra4-pause-overlay theme-soviet" role="dialog" aria-modal="true" aria-labelledby="pause-title"><MetalPanel title="ИГРА ПРИОСТАНОВЛЕНА"><h2 id="pause-title">ПАУЗА</h2><MilitaryButton tone="primary" onClick={onResume}>ВЕРНУТЬСЯ В ИГРУ</MilitaryButton><MilitaryButton disabled title="Настройки пока недоступны">НАСТРОЙКИ</MilitaryButton><MilitaryButton icon="exit" onClick={onExit}>ВЫЙТИ В МЕНЮ</MilitaryButton></MetalPanel></div>;
};
