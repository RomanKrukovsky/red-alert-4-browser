import React from 'react';
import { HUDHeader } from './HUDHeader.js';
import { Minimap } from './Minimap.js';
import { ProductionPanel } from './ProductionPanel.js';
import { CommandBar } from './CommandBar.js';
import { EVALog } from './EVALog.js';
import './MainHUD.css';
import { useUIStore } from '../store.js';

interface MainHUDProps {
  onIssueCommand?: (cmd: any) => void;
}

export const MainHUD: React.FC<MainHUDProps> = ({ onIssueCommand }) => {
  const { theme } = useUIStore();
  
  return (
    <div className={`ra4-hud-container theme-${theme}`}>
      {/* Top Bar */}
      <div className="ra4-hud-top-bar ra4-hud-interactive">
        <HUDHeader />
      </div>

      {/* Middle Content */}
      <div className="ra4-hud-middle">
        {/* Left Side: EVA Messages */}
        <EVALog />

        {/* Right Side is empty here because Production Panel extends up from bottom */}
      </div>

      {/* Bottom Bar */}
      <div className="ra4-hud-bottom">
        <div className="ra4-hud-interactive">
           <Minimap />
        </div>
        <div className="ra4-hud-interactive" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
           <CommandBar />
        </div>
        <div className="ra4-hud-interactive">
           <ProductionPanel onIssueCommand={onIssueCommand} />
        </div>
      </div>
    </div>
  );
};
