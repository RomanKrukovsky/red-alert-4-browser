import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HUDHeader } from './HUDHeader.js';
import { Minimap } from './Minimap.js';
import { ProductionPanel } from './ProductionPanel.js';
import { CommandBar } from './CommandBar.js';
import { EVALog } from './EVALog.js';
import { useUIStore } from '../store.js';
export const MainHUD = ({ onIssueCommand }) => {
    const { theme } = useUIStore();
    return (_jsxs("div", { className: `ra4-hud-container theme-${theme}`, children: [_jsx("div", { className: "ra4-hud-top-bar ra4-hud-interactive", children: _jsx(HUDHeader, {}) }), _jsx("div", { className: "ra4-hud-middle", children: _jsx(EVALog, {}) }), _jsxs("div", { className: "ra4-hud-bottom", children: [_jsx("div", { className: "ra4-hud-interactive", children: _jsx(Minimap, {}) }), _jsx("div", { className: "ra4-hud-interactive", style: { flex: 1, display: 'flex', justifyContent: 'center' }, children: _jsx(CommandBar, {}) }), _jsx("div", { className: "ra4-hud-interactive", children: _jsx(ProductionPanel, { onIssueCommand: onIssueCommand }) })] })] }));
};
//# sourceMappingURL=MainHUD.js.map