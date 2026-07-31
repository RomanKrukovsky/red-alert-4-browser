import React, { useState } from 'react';

export interface SkirmishSetupScreenProps {
  onStartMatch: () => void;
  onBack: () => void;
}

export const SkirmishSetupScreen: React.FC<SkirmishSetupScreenProps> = ({ onStartMatch, onBack }) => {
  const [selectedMap, setSelectedMap] = useState('Красный Рубеж (64x64)');
  const [playerFaction, setPlayerFaction] = useState('USSR');
  const [aiFaction, setAiFaction] = useState('ALLIANCE');
  const [aiDifficulty, setAiDifficulty] = useState('MEDIUM');

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button style={backBtnStyle} onClick={onBack}>◄ НАЗАД В МЕНЮ</button>
        <h2 style={{ color: '#00ffc8', margin: 0, fontFamily: 'Orbitron, sans-serif' }}>НАСТРОЙКА МАТЧА «СХВАТКА»</h2>
        <div style={{ width: '120px' }} />
      </div>

      <div style={bodyStyle}>
        {/* Left: Map Select (SC-17) */}
        <div style={mapBoxStyle}>
          <div style={panelTitleStyle}>КАРТА ТЕАТРА ВОЕННЫХ ДЕЙСТВИЙ</div>
          <div style={mapListStyle}>
            {['Красный Рубеж (64x64)', 'Заполярный Порт (128x128)', 'Пустынный Узел (96x96)'].map(m => (
              <div
                key={m}
                onClick={() => setSelectedMap(m)}
                style={{
                  ...mapItemStyle,
                  borderColor: selectedMap === m ? '#00ffc8' : 'rgba(255, 255, 255, 0.1)',
                  backgroundColor: selectedMap === m ? 'rgba(0, 255, 200, 0.15)' : 'rgba(255, 255, 255, 0.03)'
                }}
              >
                {m}
              </div>
            ))}
          </div>
          <div style={mapPreviewBoxStyle}>
            <div style={{ fontSize: '12px', color: '#888' }}>ПРЕВЬЮ КАРТЫ</div>
            <div style={{ fontWeight: 'bold', color: '#00ffc8', marginTop: '4px' }}>{selectedMap}</div>
          </div>
        </div>

        {/* Center: Slots Setup (SC-17) */}
        <div style={slotsBoxStyle}>
          <div style={panelTitleStyle}>УЧАСТНИКИ МАТЧА</div>
          
          {/* Player Slot */}
          <div style={slotRowStyle}>
            <div style={{ width: '120px', fontWeight: 'bold', color: '#fff' }}>ИГРОК 1</div>
            <select style={selectStyle} value={playerFaction} onChange={e => setPlayerFaction(e.target.value)}>
              <option value="USSR">СССР (Советский Союз)</option>
              <option value="ALLIANCE">АЛЬЯНС (Западные Союзники)</option>
              <option value="COALITION">ВОСТОЧНАЯ КОАЛИЦИЯ</option>
              <option value="CHRONO">ХРОНОЛЕГИОН</option>
            </select>
            <div style={{ color: '#ff2a4b', fontWeight: 'bold' }}>КОМАНДА 1</div>
          </div>

          {/* AI Slot */}
          <div style={slotRowStyle}>
            <div style={{ width: '120px', fontWeight: 'bold', color: '#aaa' }}>ИИ-СОПЕРНИК</div>
            <select style={selectStyle} value={aiFaction} onChange={e => setAiFaction(e.target.value)}>
              <option value="ALLIANCE">АЛЬЯНС (Западные Союзники)</option>
              <option value="USSR">СССР (Советский Союз)</option>
              <option value="COALITION">ВОСТОЧНАЯ КОАЛИЦИЯ</option>
              <option value="CHRONO">ХРОНОЛЕГИОН</option>
            </select>
            <select style={selectStyle} value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value)}>
              <option value="EASY">Легкий ИИ</option>
              <option value="MEDIUM">Средний ИИ</option>
              <option value="HARD">Тяжелый ИИ</option>
            </select>
            <div style={{ color: '#2a8bf2', fontWeight: 'bold' }}>КОМАНДА 2</div>
          </div>
        </div>

        {/* Right: Match Rules (SC-17) */}
        <div style={rulesBoxStyle}>
          <div style={panelTitleStyle}>ПРАВИЛА И СЕРВЕР</div>
          <div style={ruleRowStyle}>Стартовые средства: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>10 000 ₡</span></div>
          <div style={ruleRowStyle}>Туман войны: <span style={{ color: '#00ffc8', fontWeight: 'bold' }}>ВКЛЮЧЕН</span></div>
          <div style={ruleRowStyle}>Скорость игры: <span style={{ color: '#fff', fontWeight: 'bold' }}>1.0x (30 FPS Lockstep)</span></div>
          <div style={ruleRowStyle}>Супероружие: <span style={{ color: '#00ffc8', fontWeight: 'bold' }}>РАЗРЕШЕНО</span></div>
        </div>
      </div>

      <div style={footerStyle}>
        <button style={startBtnStyle} onClick={onStartMatch}>
          ► НАЧАТЬ МАТЧ «СХВАТКА»
        </button>
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
  padding: '30px 40px',
  boxSizing: 'border-box',
  zIndex: 3700,
  fontFamily: 'Inter, system-ui, sans-serif'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px'
};

const backBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  color: '#ccc',
  padding: '10px 18px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold'
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  display: 'grid',
  gridTemplateColumns: '300px 1fr 300px',
  gap: '24px'
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  color: '#888',
  marginBottom: '14px'
};

const mapBoxStyle: React.CSSProperties = {
  backgroundColor: 'rgba(12, 18, 28, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '8px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column'
};

const mapListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  flex: 1
};

const mapItemStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '4px',
  border: '1px solid transparent',
  color: '#fff',
  fontSize: '13px',
  cursor: 'pointer'
};

const mapPreviewBoxStyle: React.CSSProperties = {
  marginTop: '15px',
  height: '120px',
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  border: '1px dashed rgba(255, 255, 255, 0.2)',
  borderRadius: '6px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center'
};

const slotsBoxStyle: React.CSSProperties = {
  backgroundColor: 'rgba(12, 18, 28, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '8px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

const slotRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  padding: '16px',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '6px'
};

const selectStyle: React.CSSProperties = {
  backgroundColor: '#0c101a',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '4px',
  padding: '8px 12px',
  fontSize: '13px'
};

const rulesBoxStyle: React.CSSProperties = {
  backgroundColor: 'rgba(12, 18, 28, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '8px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const ruleRowStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#ccc'
};

const footerStyle: React.CSSProperties = {
  marginTop: '20px',
  display: 'flex',
  justifyContent: 'flex-end'
};

const startBtnStyle: React.CSSProperties = {
  backgroundColor: '#00ffc8',
  color: '#05080f',
  border: 'none',
  borderRadius: '4px',
  padding: '16px 36px',
  fontSize: '18px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontFamily: 'Orbitron, sans-serif'
};
