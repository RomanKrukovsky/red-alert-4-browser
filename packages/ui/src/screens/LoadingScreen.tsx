import React from 'react';

export interface LoadingScreenProps {
  progress: number;
  mapName?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, mapName = 'Красный Рубеж (64x64)' }) => {
  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <div style={badgeStyle}>ЗАКЛЮЧИТЕЛЬНАЯ ПОДГОТОВКА СЕРВЕРА</div>
        <h1 style={titleStyle}>{mapName}</h1>
        <p style={{ color: '#aaa', marginBottom: '40px' }}>Загрузка 3D-моделей, шейдеров, PBR-ландшафта и инициализация sim-core...</p>

        <div style={progressTrackStyle}>
          <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#00ffc8', transition: 'width 0.1s ease' }} />
        </div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00ffc8', marginTop: '12px' }}>
          {progress}%
        </div>

        <div style={hintBoxStyle}>
          <span style={{ color: '#ff4d4d', fontWeight: 'bold' }}>ТАКТИЧЕСКИЙ СОВЕТ:</span> Используйте горячие группы Ctrl+1..9 для мгновенного объединения танков и комбайнов в штурмовые кулаки.
        </div>
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
  backgroundColor: '#05080f',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 3900,
  fontFamily: 'Inter, system-ui, sans-serif'
};

const contentStyle: React.CSSProperties = {
  textAlign: 'center',
  maxWidth: '600px',
  color: '#fff'
};

const badgeStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  color: '#00ffc8',
  marginBottom: '10px'
};

const titleStyle: React.CSSProperties = {
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
  fontFamily: 'Orbitron, sans-serif'
};

const progressTrackStyle: React.CSSProperties = {
  width: '100%',
  height: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  borderRadius: '5px',
  overflow: 'hidden'
};

const hintBoxStyle: React.CSSProperties = {
  marginTop: '40px',
  padding: '16px 20px',
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '6px',
  fontSize: '13px',
  color: '#ccc',
  lineHeight: 1.5
};
