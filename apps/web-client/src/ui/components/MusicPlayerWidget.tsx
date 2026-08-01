import React, { useEffect, useState } from 'react';
import { MusicManager, TrackInfo } from '../../audio/musicManager.js';

export const MusicPlayerWidget: React.FC = () => {
  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const updateState = () => {
      const track = MusicManager.getInstance().getCurrentTrack();
      setCurrentTrack(track);
    };

    updateState();
    const interval = setInterval(updateState, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMute = () => {
    const muted = MusicManager.getInstance().toggleMute();
    setIsMuted(muted);
  };

  const handleNextTrack = () => {
    MusicManager.getInstance().playNextBattleTrack();
    setCurrentTrack(MusicManager.getInstance().getCurrentTrack());
  };

  if (!currentTrack) return null;

  return (
    <div className={`ra4-music-player${isCollapsed ? ' is-collapsed' : ''}`}>
      <span style={{ color: '#ff2400', fontWeight: 'bold', fontSize: '14px' }}>🎵</span>
      {!isCollapsed && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '9px', color: '#ff7700', letterSpacing: '1px', textTransform: 'uppercase' }}>
            СУНДТРЕК — RED ALERT 4
          </span>
          <span style={{ color: '#00ffcc', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            {currentTrack.title}
          </span>
        </div>
      )}
      <button
        onClick={handleNextTrack}
        title="Следующий трек"
        style={{
          background: 'transparent',
          border: '1px solid #ff2400',
          color: '#fff',
          borderRadius: '4px',
          padding: '2px 6px',
          cursor: 'pointer',
          fontSize: '11px',
        }}
      >
        ⏭️
      </button>
      <button
        onClick={handleToggleMute}
        title={isMuted ? 'Включить звук' : 'Выключить звук'}
        style={{
          background: 'transparent',
          border: '1px solid #555',
          color: isMuted ? '#ff4444' : '#00ff00',
          borderRadius: '4px',
          padding: '2px 6px',
          cursor: 'pointer',
          fontSize: '11px',
        }}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          fontSize: '10px',
          marginLeft: '4px',
        }}
      >
        {isCollapsed ? '◀' : '▼'}
      </button>
    </div>
  );
};
