import React, { useEffect, useMemo, useState } from 'react';
import { FactionId } from '@ra4/shared-types';
import { Emblem, MetalPanel, MilitaryButton, RA4Icon } from '../components/RA4Primitives.js';
import { factionThemeById } from '../types.js';

export const SplashScreen: React.FC<{ onEnter: () => void }> = ({ onEnter }) => {
  useEffect(() => {
    const enter = (event: KeyboardEvent) => {
      if (!event.repeat) onEnter();
    };
    window.addEventListener('keydown', enter);
    return () => window.removeEventListener('keydown', enter);
  }, [onEnter]);

  return (
    <main className="ra4-screen ra4-splash theme-soviet" onClick={onEnter} role="button" tabIndex={0} aria-label="Перейти в главное меню">
      <div className="ra4-sky-layer" />
      <div className="ra4-city-layer" />
      <div className="ra4-lightning" />
      <div className="ra4-particle-field" />
      <section className="ra4-splash-logo">
        <Emblem />
        <p>COMMAND <span>◆</span> CONQUER</p>
        <h1>RED ALERT 4</h1>
      </section>
      <div className="ra4-splash-prompt">НАЖМИТЕ ЛЮБУЮ КЛАВИШУ</div>
      <div className="ra4-technical-copy">RA4 // SECURE BOOT 4.7.12 // COMMAND NETWORK READY</div>
    </main>
  );
};

const menuItems = [
  { id: 'CAMPAIGN', label: 'КАМПАНИЯ', icon: 'star' as const },
  { id: 'MULTIPLAYER', label: 'СЕТЕВАЯ ИГРА', icon: 'globe' as const, deferred: true },
  { id: 'SKIRMISH', label: 'СХВАТКА', icon: 'crossed' as const },
  { id: 'EDITOR', label: 'РЕДАКТОР', icon: 'repair' as const, deferred: true },
  { id: 'ENCYCLOPEDIA', label: 'ЭНЦИКЛОПЕДИЯ', icon: 'book' as const, deferred: true },
  { id: 'MODS', label: 'МОДИФИКАЦИИ', icon: 'gear' as const, deferred: true },
  { id: 'SETTINGS', label: 'НАСТРОЙКИ', icon: 'gear' as const, deferred: true },
  { id: 'EXIT', label: 'ВЫХОД', icon: 'exit' as const },
];

export const MainMenuScreen: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => {
  const [active, setActive] = useState('CAMPAIGN');

  return (
    <main className="ra4-screen ra4-main-menu theme-soviet">
      <div className="ra4-command-room" />
      <div className="ra4-map-table"><span /><span /><span /></div>
      <header className="ra4-menu-logo">
        <Emblem compact />
        <div><small>COMMAND &amp; CONQUER</small><strong>RED ALERT 4</strong></div>
      </header>
      <MetalPanel className="ra4-main-navigation" aria-label="Главное меню">
        <div className="ra4-nav-crown"><RA4Icon name="star" size={21} /></div>
        {menuItems.map((item) => (
          <MilitaryButton
            key={item.id}
            icon={item.icon}
            tone={active === item.id ? 'primary' : item.deferred ? 'disabled' : 'quiet'}
            onMouseEnter={() => !item.deferred && setActive(item.id)}
            onFocus={() => !item.deferred && setActive(item.id)}
            onClick={() => !item.deferred && onSelect(item.id)}
            aria-describedby={item.deferred ? `${item.id}-state` : undefined}
          >
            {item.label}{item.deferred && <small id={`${item.id}-state`}>В РАЗРАБОТКЕ</small>}
          </MilitaryButton>
        ))}
      </MetalPanel>
      <section className="ra4-menu-footer">
        <MetalPanel className="ra4-profile-panel">
          <Emblem compact /><div><b>КОМАНДИР</b><span>УРОВЕНЬ 25</span><progress value="45780" max="75000" /><small>45 780 / 75 000</small></div>
        </MetalPanel>
        <MetalPanel className="ra4-intel-card" title="НОВОСТИ"><p>Добро пожаловать, командир.<br />Красная угроза возвращается.</p><i>● ● ● ●</i></MetalPanel>
        <MetalPanel className="ra4-intel-card" title="СВОДКА ОПЕРАЦИЙ"><p>Глобальная обстановка нестабильна.<br />Готовность командования: высокая.</p></MetalPanel>
        <MetalPanel className="ra4-footer-emblem"><Emblem compact /></MetalPanel>
      </section>
      <footer className="ra4-status-strip"><span>СЕТЬ: <b>ПОДКЛЮЧЕНО</b></span><span>СЕРВИСЫ: <b>ДОСТУПНЫ</b></span><span>ВЕРСИЯ 1.0.0</span></footer>
    </main>
  );
};

const campaigns = [
  { id: FactionId.USSR, name: 'СССР', className: 'soviet', motto: 'СЛАВА РОДИНЕ. БУДУЩЕЕ ЗА НАМИ.', leader: 'МАРШАЛ СОКОЛОВ' },
  { id: FactionId.ALLIANCE, name: 'АЛЬЯНС', className: 'allies', motto: 'ВЕРНОСТЬ. ЕДИНСТВО. ПОБЕДА.', leader: 'ПРЕЗИДЕНТ УОРД' },
  { id: FactionId.ORIENTAL_COALITION, name: 'ВОСТОЧНАЯ КОАЛИЦИЯ', className: 'coalition', motto: 'ДУШОЙ В ТРАДИЦИИ. СИЛОЙ В БУДУЩЕМ.', leader: 'ВЕЛИКИЙ СОВЕТ' },
  { id: FactionId.CHRONOLEGION, name: 'ХРОНОЛЕГИОН', className: 'chronolegion', motto: 'ВЛАСТЬ НАД ВРЕМЕНЕМ.', leader: 'ХРАНИТЕЛЬ' },
];

const campaignProfiles: Record<Exclude<FactionId, FactionId.NEUTRAL>, {
  title: string;
  leader: string;
  rank: string;
  chapters: string[];
  doctrine: string;
  progress: number;
}> = {
  [FactionId.USSR]: { title: 'КРАСНЫЙ РАССВЕТ', leader: 'МАРШАЛ ВИКТОР СОКОЛОВ', rank: 'ВЕРХОВНОЕ КОМАНДОВАНИЕ', chapters: ['ЖЕЛЕЗНАЯ ВОЛЯ', 'ОГНЕННЫЙ РУБЕЖ', 'ПОСЛЕДНИЙ МАРШ'], doctrine: 'Тяжёлая броня, массированный штурм и абсолютное превосходство.', progress: 38 },
  [FactionId.ALLIANCE]: { title: 'ЩИТ СВОБОДЫ', leader: 'ГЕНЕРАЛ ЭЛЕНОР УОРД', rank: 'ОБЪЕДИНЁННЫЙ ШТАБ', chapters: ['СИНИЙ ГОРИЗОНТ', 'НЕБЕСНЫЙ МОСТ', 'ЕДИНЫЙ ФРОНТ'], doctrine: 'Высокоточные системы, авиация и сетевая координация.', progress: 22 },
  [FactionId.ORIENTAL_COALITION]: { title: 'НЕФРИТОВЫЙ ДРАКОН', leader: 'СТРАТЕГ ЛИНЬ ВЭЙ', rank: 'ВЕЛИКИЙ СОВЕТ', chapters: ['ПРОБУЖДЕНИЕ', 'ЗОЛОТОЙ ПУТЬ', 'ВОЛЯ ДРАКОНА'], doctrine: 'Гибкая оборона, рои машин и безупречный баланс сил.', progress: 16 },
  [FactionId.CHRONOLEGION]: { title: 'РАЗЛОМ ВРЕМЕНИ', leader: 'ХРАНИТЕЛЬ КАССИАН', rank: 'ХРОНОКОНКЛАВ', chapters: ['ЭХО БУДУЩЕГО', 'НУЛЕВОЙ ЧАС', 'ВЕЧНЫЙ ЦИКЛ'], doctrine: 'Темпоральные поля, фазовые удары и контроль пространства.', progress: 9 },
};

const campaignClassByFaction: Record<Exclude<FactionId, FactionId.NEUTRAL>, string> = {
  [FactionId.USSR]: 'soviet',
  [FactionId.ALLIANCE]: 'allies',
  [FactionId.ORIENTAL_COALITION]: 'coalition',
  [FactionId.CHRONOLEGION]: 'chronolegion',
};

export const FactionCampaignScreen: React.FC<{ faction: Exclude<FactionId, FactionId.NEUTRAL>; onBack: () => void; onContinue: () => void }> = ({ faction, onBack, onContinue }) => {
  const profile = campaignProfiles[faction];
  const factionClass = campaignClassByFaction[faction];
  return (
    <main className={`ra4-screen ra4-faction-campaign theme-${factionThemeById[faction]} is-${factionClass}`}>
      <div className="ra4-faction-atmosphere" /><div className="ra4-faction-orbit" />
      <header><div className="ra4-wordmark">COMMAND &amp; CONQUER <b>RED ALERT 4</b></div><span>{profile.rank}</span><Emblem compact /></header>
      <nav className="ra4-campaign-rail" aria-label="Разделы кампании"><b>КАМПАНИЯ</b><button className="is-active">ОБЗОР</button><button>ГЛАВЫ</button><button>АРХИВ</button><button>НАГРАДЫ</button></nav>
      <section className="ra4-leader-stage"><div className="ra4-leader-portrait" /><div className="ra4-leader-id"><small>{profile.rank}</small><strong>{profile.leader}</strong></div></section>
      <MetalPanel className="ra4-campaign-dossier" title="ДОСЬЕ КАМПАНИИ"><small>ОПЕРАЦИОННЫЙ ПЛАН</small><h1>{profile.title}</h1><p>{profile.doctrine}</p><div className="ra4-faction-stat"><span>ПРОГРЕСС</span><b>{profile.progress}%</b><progress value={profile.progress} max="100" /></div><div className="ra4-faction-stat"><span>ПОБЕДЫ</span><b>07 / 18</b></div></MetalPanel>
      <MetalPanel className="ra4-chapter-list" title="ГЛАВЫ ОПЕРАЦИИ">{profile.chapters.map((chapter, index) => <button key={chapter} className={index === 0 ? 'is-active' : ''}><i>{String(index + 1).padStart(2, '0')}</i><span><b>{chapter}</b><small>{index === 0 ? 'ДОСТУПНО' : 'ЗАБЛОКИРОВАНО'}</small></span><RA4Icon name={index === 0 ? 'play' : 'stop'} size={18} /></button>)}</MetalPanel>
      <div className="ra4-screen-actions"><MilitaryButton icon="back" onClick={onBack}>НАЗАД</MilitaryButton><MilitaryButton tone="primary" icon="play" onClick={onContinue}>ОТКРЫТЬ КАРТУ</MilitaryButton></div>
    </main>
  );
};

export const CampaignSelectScreen: React.FC<{ onBack: () => void; onSelect: (faction: FactionId) => void }> = ({ onBack, onSelect }) => {
  const [selected, setSelected] = useState(FactionId.USSR);
  const current = useMemo(() => campaigns.find((item) => item.id === selected) ?? campaigns[0], [selected]);

  return (
    <main className="ra4-screen ra4-campaign-select theme-soviet">
      <div className="ra4-campaign-world" />
      <header className="ra4-campaign-header"><div className="ra4-wordmark">COMMAND &amp; CONQUER <b>RED ALERT 4</b></div><h1>ВЫБОР КАМПАНИИ</h1><span>ТОВАРИЩ КОМАНДИР<br /><b>УРОВЕНЬ 47</b></span></header>
      <section className="ra4-faction-cards">
        {campaigns.map((campaign) => (
          <button key={campaign.id} className={`ra4-faction-card is-${campaign.className}${selected === campaign.id ? ' is-selected' : ''}`} onClick={() => setSelected(campaign.id)}>
            <div className="ra4-faction-portrait"><span /></div>
            <Emblem compact />
            <strong>{campaign.name}</strong>
          </button>
        ))}
      </section>
      <MetalPanel className="ra4-campaign-details" title="О ВЫБРАННОЙ КАМПАНИИ">
        <h2>{current.name}</h2><b>{current.motto}</b><p>Возглавьте вооружённые силы фракции в глобальной войне. Каждая операция меняет стратегическую обстановку и открывает новые технологии.</p>
        <div className="ra4-campaign-progress"><span>ПРОГРЕСС КАМПАНИИ</span><progress value="6" max="18" /><small>06 / 18</small></div>
        <MilitaryButton tone="primary" icon="play" onClick={() => onSelect(current.id)}>ПРОДОЛЖИТЬ КАМПАНИЮ</MilitaryButton>
      </MetalPanel>
      <div className="ra4-screen-actions"><MilitaryButton icon="back" onClick={onBack}>НАЗАД</MilitaryButton><span>1927 <Emblem compact /> 2047</span></div>
    </main>
  );
};

const missions = ['ВАРШАВА', 'БЕРЛИН', 'ПРИБАЛТИКА', 'КИЕВ', 'ЛЕНИНГРАД', 'СТАЛИНГРАД', 'КАВКАЗ', 'ТЕГЕРАН'];

export const StrategicMapScreen: React.FC<{ onBack: () => void; onContinue: () => void }> = ({ onBack, onContinue }) => {
  const [selected, setSelected] = useState(5);
  return (
    <main className="ra4-screen ra4-strategic-map theme-soviet">
      <header><Emblem compact /><div><h1>СССР</h1><span>СЛАВА СОВЕТСКОМУ СОЮЗУ!</span></div><div className="ra4-wordmark">COMMAND &amp; CONQUER <b>RED ALERT 4</b></div></header>
      <section className="ra4-map-surface">
        <div className="ra4-map-grid" />
        <svg viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true"><path d="M110 260 240 390 400 210 540 305 690 350 610 510" /><path d="M240 390 410 430 540 305 765 250 610 510" /></svg>
        {missions.map((mission, index) => <button key={mission} className={`ra4-mission-node node-${index + 1}${selected === index ? ' is-active' : ''}`} onClick={() => setSelected(index)}><RA4Icon name="star" size={18} /><span>{String(index + 1).padStart(2, '0')}. {mission}</span><small>★ ★ ★</small></button>)}
      </section>
      <MetalPanel className="ra4-mission-detail" title={`${String(selected + 1).padStart(2, '0')}. ОПЕРАЦИЯ «МОЛОТ»`}>
        <div className="ra4-mission-preview" /><h3>ЦЕЛЬ МИССИИ</h3><p>Прорвите оборону противника и захватите стратегический исследовательский комплекс.</p><h3>НАГРАДЫ</h3><div className="ra4-rewards"><span><RA4Icon name="star" /> 1 500</span><span><RA4Icon name="credits" /> 10 000</span></div><label>СЛОЖНОСТЬ <b>ВЕТЕРАН</b></label><MilitaryButton tone="primary" icon="play" onClick={onContinue}>НАЧАТЬ МИССИЮ</MilitaryButton>
      </MetalPanel>
      <div className="ra4-screen-actions"><MilitaryButton icon="back" onClick={onBack}>НАЗАД</MilitaryButton></div>
    </main>
  );
};

export const BriefingScreen: React.FC<{ onBack: () => void; onContinue: () => void }> = ({ onBack, onContinue }) => (
  <main className="ra4-screen ra4-briefing theme-soviet">
    <header><div className="ra4-wordmark">COMMAND &amp; CONQUER <b>RED ALERT 4</b></div><h1>БРИФИНГ ОПЕРАЦИИ</h1><span>ТОВАРИЩ КОМАНДИР<br />УРОВЕНЬ 45</span></header>
    <MetalPanel className="ra4-briefing-data" title="ОПЕРАЦИЯ «КРАСНЫЙ РАССВЕТ»"><p>Альянс стягивает войска к нашим границам. Нанесите упреждающий удар и сломите волю противника.</p><h3>ЦЕЛИ ОПЕРАЦИИ</h3>{['Уничтожить командный центр Альянса', 'Вывести из строя спутниковую связь', 'Обеспечить контроль над мостом', 'Эвакуировать силы в зону сбора'].map((objective) => <div className="ra4-objective" key={objective}><RA4Icon name="star" size={17} />{objective}</div>)}<h3>ДАННЫЕ РАЗВЕДКИ</h3><p>Зафиксирована тяжёлая техника и авиация. Спутниковая связь обеспечивает координацию противника.</p></MetalPanel>
    <section className="ra4-commander-feed"><div className="ra4-scanline" /><div className="ra4-commander-silhouette" /><div className="ra4-nameplate"><Emblem compact /><span>МАРШАЛ<br /><b>ВИКТОР СОКОЛОВ</b></span></div></section>
    <MetalPanel className="ra4-briefing-intel" title="РАССТАНОВКА СИЛ ПРОТИВНИКА"><div className="ra4-intel-map" /><h3>ПЕРЕХВАЧЕННЫЕ ПЕРЕГОВОРЫ</h3><div className="ra4-waveform" /><p>…полный ввод сил по сигналу. Кодовое слово: «Свобода»…</p><h3>КОДОВОЕ СЛОВО</h3><strong>ГРОМ</strong></MetalPanel>
    <div className="ra4-briefing-actions"><MilitaryButton icon="back" onClick={onBack}>НАЗАД</MilitaryButton><MilitaryButton tone="primary" onClick={onContinue}>ПРОДОЛЖИТЬ</MilitaryButton></div>
  </main>
);

export const TransmissionScreen: React.FC<{ onBack: () => void; onContinue: () => void }> = ({ onBack, onContinue }) => {
  const [subtitle, setSubtitle] = useState(0);
  const lines = ['Командир, канал защищён. Начинаем передачу.', 'Спутники подтверждают движение бронетанковой колонны.', 'Перехватите цель до выхода к северному мосту.'];

  useEffect(() => {
    const timer = window.setInterval(() => setSubtitle((value) => Math.min(value + 1, lines.length - 1)), 2200);
    return () => window.clearInterval(timer);
  }, [lines.length]);

  return (
    <main className="ra4-screen ra4-transmission theme-soviet">
      <header><span>ЗАЩИЩЁННЫЙ КАНАЛ // 04-7</span><h1>ПРЯМАЯ СВЯЗЬ</h1><b>СИГНАЛ 97%</b></header>
      <section className="ra4-transmission-feed is-primary"><div className="ra4-feed-grid" /><div className="ra4-commander-silhouette" /><div className="ra4-scanline" /><label>КАНАЛ А — МОСКВА</label></section>
      <section className="ra4-transmission-feed is-secondary"><div className="ra4-feed-map" /><div className="ra4-scanline" /><label>КАНАЛ Б — ПОЛЕВОЙ ШТАБ</label></section>
      <MetalPanel className="ra4-transmission-data" title="ТЕЛЕМЕТРИЯ"><div className="ra4-waveform" /><p>ШИФРОВАНИЕ: ГОСТ-47</p><p>ЗАДЕРЖКА: 32 МС</p><p>ИСТОЧНИК: ВЕРИФИЦИРОВАН</p><strong>ПРИОРИТЕТ: КРАСНЫЙ</strong></MetalPanel>
      <div className="ra4-subtitles"><small>МАРШАЛ СОКОЛОВ</small><p>{lines[subtitle]}</p></div>
      <div className="ra4-briefing-actions"><MilitaryButton icon="back" onClick={onBack}>ПРЕРВАТЬ</MilitaryButton><MilitaryButton tone="primary" onClick={onContinue}>ПРИНЯТЬ ПРИКАЗ</MilitaryButton></div>
    </main>
  );
};

export const CommandCenterScreen: React.FC<{ faction: FactionId.ALLIANCE | FactionId.ORIENTAL_COALITION; onBack: () => void; onContinue: () => void }> = ({ faction, onBack, onContinue }) => {
  const allies = faction === FactionId.ALLIANCE;
  return (
    <main className={`ra4-screen ra4-command-center theme-${allies ? 'allies' : 'coalition'} ${allies ? 'is-allies' : 'is-coalition'}`}>
      <div className="ra4-command-globe" />
      <header><Emblem compact /><div><small>{allies ? 'ОБЪЕДИНЁННОЕ КОМАНДОВАНИЕ' : 'СТРАТЕГИЧЕСКИЙ СОВЕТ'}</small><h1>{allies ? 'СЕВЕРНЫЙ ЩИТ' : 'НЕФРИТОВЫЙ РУБЕЖ'}</h1></div><span>СЕАНС 04:17:22<br />ДОПУСК: АЛЬФА</span></header>
      <MetalPanel className="ra4-command-roster" title="СОСТАВ ОПЕРАЦИИ">{['КОМАНДОВАНИЕ', 'РАЗВЕДКА', 'АВИАЦИЯ', 'ЛОГИСТИКА'].map((unit, index) => <button key={unit} className={index === 0 ? 'is-active' : ''}><i /><span><b>{unit}</b><small>{index === 0 ? 'НА СВЯЗИ' : 'ГОТОВНОСТЬ'}</small></span></button>)}</MetalPanel>
      <section className="ra4-command-video"><div className="ra4-command-face" /><div className="ra4-scanline" /><label>{allies ? 'ГЕНЕРАЛ ЭЛЕНОР УОРД' : 'СТРАТЕГ ЛИНЬ ВЭЙ'}</label></section>
      <MetalPanel className="ra4-command-intel" title="ОПЕРАТИВНАЯ ОБСТАНОВКА"><div className="ra4-command-map"><i /><i /><i /></div><h3>КЛЮЧЕВАЯ ЗАДАЧА</h3><p>{allies ? 'Удержать воздушный коридор и развернуть орбитальную связь.' : 'Стабилизировать восточный фронт и защитить узлы снабжения.'}</p><div className="ra4-waveform" /></MetalPanel>
      <div className="ra4-screen-actions"><MilitaryButton icon="back" onClick={onBack}>НАЗАД</MilitaryButton><MilitaryButton tone="primary" onClick={onContinue}>К СТРАТЕГИЧЕСКОЙ КАРТЕ</MilitaryButton></div>
    </main>
  );
};

export const MatchResultScreen: React.FC<{ result: 'victory' | 'defeat'; onMenu: () => void; onRetry: () => void }> = ({ result, onMenu, onRetry }) => {
  const victory = result === 'victory';
  return (
    <main className={`ra4-screen ra4-match-result theme-soviet is-${result}`}>
      <div className="ra4-result-rays" />
      <section className="ra4-result-title"><Emblem /><small>ОПЕРАЦИЯ ЗАВЕРШЕНА</small><h1>{victory ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}</h1><p>{victory ? 'Задачи выполнены. Стратегический сектор под нашим контролем.' : 'Командный центр потерян. Силы отступают к резервному рубежу.'}</p></section>
      <MetalPanel className="ra4-result-stats" title="ИТОГИ ОПЕРАЦИИ"><div><span>ВРЕМЯ БОЯ</span><b>24:17</b></div><div><span>УНИЧТОЖЕНО</span><b>47</b></div><div><span>ПОТЕРИ</span><b>12</b></div><div><span>ЭФФЕКТИВНОСТЬ</span><b>{victory ? '87%' : '34%'}</b></div></MetalPanel>
      <div className="ra4-result-actions"><MilitaryButton onClick={onMenu}>ГЛАВНОЕ МЕНЮ</MilitaryButton><MilitaryButton tone="primary" icon="play" onClick={onRetry}>ПОВТОРИТЬ ОПЕРАЦИЮ</MilitaryButton></div>
    </main>
  );
};
