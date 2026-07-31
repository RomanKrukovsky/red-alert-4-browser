import React from 'react';
import { CommandType } from '@ra4/shared-types';
export const CommandBar = ({ onCommand }) => {
    const cmds = [
        { type: CommandType.MOVE, label: 'МАРШ' },
        { type: CommandType.ATTACK, label: 'АТАКА' },
        { type: CommandType.STOP, label: 'СТОП' },
        { type: CommandType.HOLD, label: 'ДЕРЖАТЬ' },
        { type: CommandType.PATROL, label: 'ПАТРУЛЬ' },
        { type: CommandType.REPAIR_STRUCTURE, label: 'РЕМОНТ' },
        { type: CommandType.SELL_STRUCTURE, label: 'ПРОДАТЬ' }
    ];
    return (<div style={{
            display: 'flex',
            gap: '6px',
            background: 'rgba(12, 18, 28, 0.9)',
            padding: '6px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderRight: '1px solid rgba(255,255,255,0.1)'
        }}>
      {cmds.map(c => (<button key={c.type} onClick={() => onCommand?.(c.type)} style={{
                background: 'linear-gradient(180deg, #2a3444 0%, #1a2230 100%)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: '#fff',
                padding: '6px 12px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer'
            }}>
          {c.label}
        </button>))}
    </div>);
};
//# sourceMappingURL=CommandBar.js.map