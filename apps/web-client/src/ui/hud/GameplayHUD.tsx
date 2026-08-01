import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OFFICIAL_BUILDINGS, OFFICIAL_UNITS } from '@ra4/content-runtime';
import { CommandType, FactionId, PlayerCommand, UnitCategory, WorldSnapshot } from '@ra4/shared-types';
import { MetalPanel, MilitaryButton, RA4Icon, Resource } from '../components/RA4Primitives.js';
import { useUIStore } from '@ra4/ui';
import { FactionTheme, factionThemeById } from '../types.js';
import { createGameplayHUDViewModel, formatResource, queueProgress } from '../view-models/gameplayHUDViewModel.js';
import { sfxManager } from '../../audio/sfxManager.js';

type ProductionTab = 'BUILDINGS' | 'INFANTRY' | 'VEHICLES' | 'AIR' | 'NAVAL';

interface GameplayHUDProps {
  faction: FactionId;
  snapshot: WorldSnapshot | null;
  selectedEntityIds: number[];
  onIssueCommand: (command: PlayerCommand) => void;
  onBeginBuildingPlacement: (structureId: string) => void;
  onBeginCommandMode: (mode: CommandType.MOVE | CommandType.ATTACK) => void;
  onPause: () => void;
  onMinimapClick?: (worldX: number, worldY: number) => void;
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

const productIcons: Partial<Record<FactionTheme, Partial<Record<Exclude<ProductionTab, 'BUILDINGS'>, readonly string[]>>>> = {
  soviet: {
    INFANTRY: ['/assets/ui/unit-icons/SU_Conscript.png', '/assets/ui/unit-icons/SU_FlakTrooper.png'],
    VEHICLES: ['/assets/ui/unit-icons/SU_HammerTank.png', '/assets/ui/unit-icons/SU_SickleScout.png'],
    AIR: ['/assets/ui/unit-icons/SU_MiG41.png'],
    NAVAL: ['/assets/ui/unit-icons/SU_TyphoonSub.png'],
  },
  allies: {
    INFANTRY: ['/assets/ui/unit-icons/AL_Peacekeeper.png', '/assets/ui/unit-icons/AL_Javelin.png'],
    VEHICLES: ['/assets/ui/unit-icons/AL_Guardian.png', '/assets/ui/unit-icons/AL_Mirage.png'],
    AIR: ['/assets/ui/unit-icons/AL_Harrier.png'],
    NAVAL: ['/assets/ui/unit-icons/AL_Poseidon.png'],
  },
};

const productIcon = (theme: FactionTheme, kind: ProductionTab, variant: number): string | undefined => {
  if (kind === 'BUILDINGS') return undefined;
  
  // Use soviet or allies as fallback if theme has no icons defined
  const effectiveTheme = productIcons[theme] ? theme : (theme === 'chronolegion' ? 'allies' : 'soviet');
  const icons = productIcons[effectiveTheme]?.[kind];
  return icons && icons.length > 0 ? icons[variant % icons.length] : undefined;
};

const ProductVisual: React.FC<{ kind: ProductionTab; variant: number; theme: FactionTheme }> = ({ kind, variant, theme }) => (
  <div className={`ra4-product-visual is-${kind.toLowerCase()} variant-${variant % 4}`} aria-hidden="true">
    {productIcon(theme, kind, variant) && <img src={productIcon(theme, kind, variant)} alt="" />}
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

export const GameplayHUD: React.FC<GameplayHUDProps> = ({ faction, snapshot, selectedEntityIds, onIssueCommand, onBeginBuildingPlacement, onBeginCommandMode, onPause, onMinimapClick }) => {
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingMinimap = useRef(false);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const mapMax = 64000;

    const renderMinimap = () => {
      const currentSnapshot = useUIStore.getState().snapshot;
      if (!currentSnapshot) {
        animationFrameId = requestAnimationFrame(renderMinimap);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      currentSnapshot.entities.forEach(entity => {
        const cx = (entity.position.x / mapMax) * canvas.width;
        const cy = (entity.position.y / mapMax) * canvas.height;
        
        ctx.fillStyle = entity.playerIndex === 0 ? '#28b949' : '#ff3c3c';
        if (entity.isBuilding) {
          ctx.fillRect(cx - 3, cy - 3, 6, 6);
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      animationFrameId = requestAnimationFrame(renderMinimap);
    };
    
    renderMinimap();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleMinimapInteraction = (e: React.MouseEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onMinimapClick) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const worldX = (x / rect.width) * 64000;
    const worldY = (y / rect.height) * 64000;
    
    onMinimapClick(worldX, worldY);
  };

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

  const issueCancelQueue = useCallback((producerEntityId: number, queueIndex: number) => {
    onIssueCommand({ type: CommandType.CANCEL_PRODUCTION, entityIds: [producerEntityId], playerIndex: 0, tick: viewModel.tick + 1, producerEntityId, queueIndex });
  }, [onIssueCommand, viewModel.tick]);

  const getStatusText = (): string => {
    if (!viewModel.selected) return 'ОЖИДАЕТ ПРИКАЗОВ';
    if (viewModel.selected.isDisabled) return 'СИСТЕМЫ ОТКЛЮЧЕНЫ';
    if (viewModel.selected.hasAttackTarget) return 'В БОЮ';
    if (viewModel.selected.currentOre > 0) return `РУДА: ${viewModel.selected.currentOre}/${viewModel.selected.maxOre}`;
    if (viewModel.selected.hasMoveTarget) return 'ВЫПОЛНЯЕТ ПРИКАЗ';
    return 'ОЖИДАЕТ ПРИКАЗОВ';
  };

  const specLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of OFFICIAL_BUILDINGS) map.set(b.id, b.name);
    for (const u of OFFICIAL_UNITS) map.set(u.id, u.name);
    return map;
  }, []);

  // Global button SFX delegation
  const hudRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = hudRef.current;
    if (!el) return;

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button')) sfxManager.playSfx('hover');
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button:not(:disabled)')) sfxManager.playSfx('click');
    };

    el.addEventListener('mouseover', onMouseOver, { passive: true });
    el.addEventListener('click', onClick, { capture: true, passive: true });
    
    return () => {
      el.removeEventListener('mouseover', onMouseOver);
      el.removeEventListener('click', onClick, { capture: true });
    };
  }, []);

  return (
    <main ref={hudRef} className={`ra4-gameplay-hud theme-${theme}`} aria-label="Поле боя">
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
        <canvas 
          ref={canvasRef} 
          width="300" 
          height="220" 
          aria-label="Тактическая миникарта"
          onPointerDown={(e) => { isDraggingMinimap.current = true; handleMinimapInteraction(e); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (isDraggingMinimap.current) handleMinimapInteraction(e); }}
          onPointerUp={(e) => { isDraggingMinimap.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
          style={{ cursor: 'crosshair', touchAction: 'none' }}
        />
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
          return <button key={product.id} className={`${available ? '' : 'is-disabled'}${available && index === 1 ? ' is-ready' : ''}`} aria-label={`${product.name}, ${product.cost} кредитов${available ? '' : `. ${unavailableReason}`}`} title={available ? product.name : unavailableReason} onClick={() => activeTab === 'BUILDINGS' ? canBuild && onBeginBuildingPlacement(product.id) : canProduce && issueProduction(product.id)} disabled={!available}><ProductVisual kind={activeTab} variant={index} theme={theme} /><b>{product.name}</b><span><RA4Icon name="credits" size={12} />{product.cost}</span>{available && index === 1 && <em>ГОТОВО</em>}</button>;
        })}{products.length === 0 && <div className="ra4-production-empty"><RA4Icon name="gear" size={28} /><span>НЕТ ДОСТУПНЫХ ПРОЕКТОВ</span></div>}</div></div>
        <div className="ra4-production-tools">{productionTools.map(({ icon, label }) => <button key={icon} aria-label={`${label} — пока недоступно`} title={`${label} — пока недоступно`} disabled><RA4Icon name={icon} size={18} /></button>)}</div>
      </MetalPanel>
      <MetalPanel className="ra4-selection-card">
        {viewModel.selectedEntities.length > 1 ? (
          /* Group selection grid */
          <div className="ra4-group-selection">
            <h3>ВЫБРАНО: {viewModel.selectedEntities.length}</h3>
            <div className="ra4-group-grid">
              {viewModel.selectedEntities.slice(0, 16).map((entity) => {
                const hpPercent = entity.maxHp > 0 ? (entity.hp / entity.maxHp) * 100 : 100;
                return (
                  <div key={entity.id} className="ra4-group-unit" title={specLookup.get(entity.specId) ?? entity.specId}>
                    <ProductVisual kind={entity.isBuilding ? 'BUILDINGS' : 'VEHICLES'} variant={entity.id % 4} theme={theme} />
                    <div className="ra4-group-hp" style={{ width: `${hpPercent}%`, background: hpPercent > 60 ? '#28b949' : hpPercent > 30 ? '#ffd700' : '#ff3c3c' }} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Single selection card */
          <>
            <div className="ra4-selected-render"><ProductVisual kind={viewModel.selected?.isBuilding === false ? 'VEHICLES' : 'BUILDINGS'} variant={2} theme={theme} /></div>
            <div className="ra4-selection-copy">
              <h3 title={selectedDisplayName}>{selectedDisplayName}</h3>
              <span>{viewModel.selected?.isBuilding ? 'ЗДАНИЕ УПРАВЛЕНИЯ' : 'БОЕВАЯ ЕДИНИЦА'}</span>
              <div className="ra4-segmented-bar" aria-label="Прочность">
                <div className="ra4-segmented-bar-fill" style={{ width: `${((viewModel.selected?.hp ?? 2500) / (viewModel.selected?.maxHp ?? 2500)) * 100}%` }} />
              </div>
              <b>{viewModel.selected?.hp ?? 2500} / {viewModel.selected?.maxHp ?? 2500}</b>
              {(viewModel.selected?.maxShield ?? 0) > 0 && (
                <div className="ra4-shield-bar">
                  <div className="ra4-shield-fill" style={{ width: `${((viewModel.selected?.shield ?? 0) / (viewModel.selected?.maxShield ?? 1)) * 100}%` }} />
                  <small>ЩИТ {viewModel.selected?.shield ?? 0} / {viewModel.selected?.maxShield ?? 0}</small>
                </div>
              )}
              <p>{getStatusText()}</p>
            </div>
            <div className="ra4-selection-emblem"><RA4Icon name="star" size={54} /></div>
          </>
        )}
      </MetalPanel>
      <MetalPanel className="ra4-queue-panel" title="ОЧЕРЕДЬ ПРОИЗВОДСТВА">{viewModel.queue.length > 0 ? viewModel.queue.map((item, index) => {
        const progress = queueProgress(item.progressTicks, item.totalTicks);
        return <div className="ra4-queue-row" key={item.id}><b>{index + 1}</b><span>{specLookup.get(item.specId) ?? item.specId}<div className="ra4-queue-progress"><div className="ra4-queue-progress-fill" style={{ '--progress': `${progress * 100}%` } as React.CSSProperties} /></div></span><small>{Math.ceil((item.totalTicks - item.progressTicks) / 30)} с</small><button aria-label="Отменить" onClick={() => issueCancelQueue(item.producerEntityId, index)}>×</button></div>;
      }) : <div className="ra4-queue-empty"><span /><p>ОЧЕРЕДЬ СВОБОДНА</p></div>}</MetalPanel>
      <MetalPanel className="ra4-command-panel">{[
        { icon: 'back', label: 'ДВИЖЕНИЕ', action: () => onBeginCommandMode(CommandType.MOVE) },
        { icon: 'target', label: 'АТАКА', action: () => onBeginCommandMode(CommandType.ATTACK) },
        { icon: 'shield', label: 'ОХРАНА' }, { icon: 'stop', label: 'СТОП', action: issueStop }, { icon: 'repair', label: 'РЕМОНТ' }, { icon: 'star', label: 'СПОСОБНОСТЬ' },
      ].map((command) => { const available = Boolean(command.action && viewModel.selected); return <button key={command.label} onClick={command.action} disabled={!available} title={available ? command.label : `${command.label} — пока недоступно`} aria-label={available ? command.label : `${command.label} — пока недоступно`}><RA4Icon name={command.icon as 'target'} size={22} /><kbd>{command.label[0]}</kbd></button>; })}</MetalPanel>
      <div className="ra4-match-time">ЭНЕРГИЯ: {viewModel.powerProduced - viewModel.powerConsumed} <div className="ra4-energy-bar"><div className="ra4-energy-fill" style={{ width: `${Math.max(0, (viewModel.powerProduced - viewModel.powerConsumed) / viewModel.powerProduced || 0) * 100}%` }} /></div><span>ВРЕМЯ: {viewModel.elapsed}</span></div>
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
