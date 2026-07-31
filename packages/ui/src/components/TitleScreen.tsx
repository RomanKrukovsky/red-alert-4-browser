import React, { useEffect } from 'react';

export interface TitleScreenProps {
  onEnter: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onEnter }) => {
  useEffect(() => {
    const handleKeyDown = () => onEnter();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnter]);

  return (
    <div style={overlayStyle} onClick={onEnter}>
      <div style={contentStyle}>
        <div style={badgeStyle}>RED ALERT 4 — BROWSER EDITION</div>
        <h1 style={titleStyle}>RED ALERT 4</h1>
        <div style={subtitleStyle}>КРАСНЫЙ РУБЕЖ</div>
        <div style={promptStyle}>НАЖМИТЕ ЛЮБУЮ КЛАВИШУ ИЛИ КЛИКНИТЕ ДЛЯ ВХОДА</div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: '#05080f',
  backgroundImage: 'radial-gradient(circle at 50% 50%, #1a080d 0%, #05080f 80%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  zIndex: 4000,
  fontFamily: 'Inter, system-ui, sans-serif'
};

const contentStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#fff'
};

const badgeStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 'bold',
  letterSpacing: '3px',
  color: '#ff4d4d',
  marginBottom: '10px'
};

const titleStyle: React.CSSProperties = {
  fontSize: '64px',
  fontWeight: '900',
  letterSpacing: '4px',
  margin: 0,
  color: '#00ffc8',
  textShadow: '0 0 30px rgba(0, 255, 200, 0.5)'
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 'bold',
  letterSpacing: '6px',
  color: '#aaa',
  marginTop: '5px',
  marginBottom: '60px'
};

const promptStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  color: '#fff',
  animation: 'pulse 1.5s infinite ease-in-out'
};
