import React, { useState } from 'react';

export interface MainMenuScreenProps {
  onSelectOption: (option: string) => void;
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({ onSelectOption }) => {
  const [activeItem, setActiveItem] = useState('СХВАТКА');

  const navItems = [
    { id: 'CAMPAIGN', label: '1. КАМПАНИЯ' },
    { id: 'MULTIPLAYER', label: '2. СЕТЕВАЯ ИГРА' },
    { id: 'SKIRMISH', label: '3. СХВАТКА' },
    { id: 'EDITOR', label: '4. РЕДАКТОР КАРТ' },
    { id: 'ENCYCLOPEDIA', label: '5. ЭНЦИКЛОПЕДИЯ' },
    { id: 'MODS', label: '6. МОДИФИКАЦИИ' },
    { id: 'SETTINGS', label: '7. НАСТРОЙКИ' },
    { id: 'EXIT', label: '8. ВЫХОД' }
  ];

  const handleNavClick = (id: string, label: string) => {
    setActiveItem(label);
    onSelectOption(id);
  };

  return (
    <div style={containerStyle}>
      {/* Top Header & Commander Profile (SC-02) */}
      <div style={topHeaderStyle}>
        <div style={brandStyle}>
          <span style={{ color: '#ff4d4d', fontWeight: 'bold' }}>RED ALERT 4</span> — ГЛАВНОЕ МЕНЮ
        </div>
        <div style={commanderCardStyle}>
          <div style={avatarBoxStyle}>🎖️</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>КОМАНДИР АЛЕКСЕЕВ</div>
            <div style={{ fontSize: '11px', color: '#00ffc8' }}>Уровень 25</div>
            <div style={xpTrackStyle}>
              <div style={{ width: '61%', height: '100%', backgroundColor: '#00ffc8' }} />
            </div>
            <div style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>45 780 / 75 000 XP</div>
          </div>
        </div>
      </div>

      {/* Middle Content */}
      <div style={middleStyle}>
        {/* Left Nav Rail (SC-02) */}
        <div style={railStyle}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id, item.label)}
              style={{
                ...navBtnStyle,
                backgroundColor: activeItem === item.label ? 'rgba(0, 255, 200, 0.15)' : 'transparent',
                borderColor: activeItem === item.label ? '#00ffc8' : 'transparent',
                color: activeItem === item.label ? '#00ffc8' : '#ccc'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Center Operations & News Summary (SC-02) */}
        <div style={opsPanelStyle}>
          <div style={opsHeaderStyle}>ОПЕРАТИВНАЯ СВОДКА И НОВОСТИ</div>
          <div style={newsBoxStyle}>
            <h3 style={{ color: '#ff4d4d', margin: '0 0 8px 0' }}>ОПЕРАЦИЯ «КРАСНЫЙ РУБЕЖ» ДОСТУПНА</h3>
            <p style={{ color: '#bbb', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
              Командование СССР сообщает о развёртывании передовых тяжелых танковых соединений ОБТ-92 «Гранит» на северном участке фронта.
            </p>
            <div style={dotsStyle}>
              <span style={{ color: '#00ffc8' }}>●</span>
              <span style={{ color: '#555' }}>●</span>
              <span style={{ color: '#555' }}>●</span>
            </div>
          </div>

          <div style={summaryGridStyle}>
            <div style={cardStyle}>
              <div style={cardTitleStyle}>ТЕКУЩИЙ РЕЖИМ</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#00ffc8' }}>Одиночная Схватка</div>
            </div>
            <div style={cardStyle}>
              <div style={cardTitleStyle}>КАРТА</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>Красный Рубеж (64x64)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Strip (SC-02) */}
      <div style={footerStyle}>
        <div>СЕТЬ: <span style={{ color: '#00ffc8' }}>ОНЛАЙН</span></div>
        <div>ЗАДЕРЖКА: <span style={{ color: '#00ffc8' }}>24 ms</span></div>
        <div>ВЕРСИЯ ДВИЖКА: <span style={{ color: '#aaa' }}>RA4 v2.0.4 (WebGPU / PBR)</span></div>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: '#070b12',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  fontFamily: 'Inter, system-ui, sans-serif',
  zIndex: 3500
};

const topHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 40px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  backgroundColor: 'rgba(12, 18, 28, 0.8)'
};

const brandStyle: React.CSSProperties = {
  fontSize: '18px',
  letterSpacing: '2px',
  color: '#fff'
};

const commanderCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 16px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.1)'
};

const avatarBoxStyle: React.CSSProperties = {
  fontSize: '24px'
};

const xpTrackStyle: React.CSSProperties = {
  width: '140px',
  height: '6px',
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  borderRadius: '3px',
  overflow: 'hidden',
  marginTop: '4px'
};

const middleStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  padding: '30px 40px',
  gap: '40px'
};

const railStyle: React.CSSProperties = {
  width: '280px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const navBtnStyle: React.CSSProperties = {
  padding: '14px 20px',
  textAlign: 'left',
  fontSize: '15px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  borderRadius: '4px',
  borderLeft: '4px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
};

const opsPanelStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '20px'
};

const opsHeaderStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  color: '#888'
};

const newsBoxStyle: React.CSSProperties = {
  backgroundColor: 'rgba(12, 18, 28, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '8px',
  padding: '24px',
  position: 'relative'
};

const dotsStyle: React.CSSProperties = {
  marginTop: '16px',
  display: 'flex',
  gap: '6px'
};

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px'
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'rgba(12, 18, 28, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '6px',
  padding: '16px'
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#888',
  marginBottom: '6px'
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '12px 40px',
  backgroundColor: 'rgba(5, 8, 15, 0.95)',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  fontSize: '12px',
  color: '#888'
};
