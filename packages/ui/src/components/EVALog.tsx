import React from 'react';

export const EVALog: React.FC = () => {
  return (
    <div className="ra4-eva-log" style={{
      width: '350px',
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      fontSize: '12px',
      fontFamily: 'var(--font-family-mono)',
      letterSpacing: 'var(--letter-spacing-wide)',
      pointerEvents: 'none',
      textShadow: '0 1px 2px #000'
    }}>
       <div style={{ color: '#00ff00' }}>[EVA] Установка связи...</div>
       <div style={{ color: '#00ff00' }}>[EVA] Командир, добро пожаловать.</div>
       <div style={{ color: '#ffcc00' }}>[СИСТЕМА] Обнаружено передвижение противника.</div>
       <div style={{ color: '#ff0000' }}>[ВНИМАНИЕ] Наша база атакована.</div>
    </div>
  );
};
