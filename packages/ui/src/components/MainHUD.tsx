import React from 'react';
import { HUDHeader } from './HUDHeader.js';
import { Minimap } from './Minimap.js';
import { ProductionPanel } from './ProductionPanel.js';
import { CommandBar } from './CommandBar.js';
import { EVALog } from './EVALog.js';

interface MainHUDProps {
  onIssueCommand?: (cmd: any) => void;
}

export const MainHUD: React.FC<MainHUDProps> = ({ onIssueCommand }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      {/* Top Bar */}
      <div style={{ pointerEvents: 'auto' }}>
        <HUDHeader />
      </div>

      {/* Middle Content */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', padding: '60px 20px 20px 20px' }}>
        {/* Left Side: EVA Messages */}
        <EVALog />

        {/* Right Side: Production Queue */}
        <div style={{ pointerEvents: 'auto' }}>
          <ProductionPanel onIssueCommand={onIssueCommand} />
        </div>
      </div>

      {/* Bottom Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '10px 20px',
        pointerEvents: 'auto'
      }}>
        <Minimap />
        <CommandBar />
      </div>
    </div>
  );
};
