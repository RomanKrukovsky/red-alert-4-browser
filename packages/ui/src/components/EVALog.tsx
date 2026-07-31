import React from 'react';
import { useUIStore } from '../store.js';

export const EVALog: React.FC = () => {
  const logs = useUIStore((s) => s.evaLogs);

  return (
    <div style={{
      width: '320px',
      maxHeight: '120px',
      overflowY: 'auto',
      background: 'rgba(12, 18, 28, 0.75)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '4px',
      padding: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      fontFamily: 'monospace',
      fontSize: '11px',
      pointerEvents: 'none'
    }}>
      {logs.map(log => (
        <div key={log.id} style={{
          color: log.type === 'DANGER' ? '#ff4d4d' : log.type === 'WARN' ? '#ffd700' : '#00ffc8'
        }}>
          [{log.timestamp}] EVA: {log.message}
        </div>
      ))}
    </div>
  );
};
