import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HUDHeader } from './HUDHeader.js';
import { Minimap } from './Minimap.js';
import { ProductionPanel } from './ProductionPanel.js';
import { CommandBar } from './CommandBar.js';
import { EVALog } from './EVALog.js';
export const MainHUD = ({ onIssueCommand }) => {
    return (_jsxs("div", { style: {
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
        }, children: [_jsx("div", { style: { pointerEvents: 'auto' }, children: _jsx(HUDHeader, {}) }), _jsxs("div", { style: { flex: 1, display: 'flex', justifyContent: 'space-between', padding: '60px 20px 20px 20px' }, children: [_jsx(EVALog, {}), _jsx("div", { style: { pointerEvents: 'auto' }, children: _jsx(ProductionPanel, { onIssueCommand: onIssueCommand }) })] }), _jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    padding: '10px 20px',
                    pointerEvents: 'auto'
                }, children: [_jsx(Minimap, {}), _jsx(CommandBar, {})] })] }));
};
//# sourceMappingURL=MainHUD.js.map