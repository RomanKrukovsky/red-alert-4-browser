import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HUDHeader } from './HUDHeader.js';
import { Minimap } from './Minimap.js';
import { ProductionPanel } from './ProductionPanel.js';
import { CommandBar } from './CommandBar.js';
import { EVALog } from './EVALog.js';
import { useUIStore } from '../store.js';
export const MainHUD = ({ onIssueCommand }) => {
    const { theme, inputMode } = useUIStore();
    return (_jsxs("div", { className: `ra4-hud-container theme-${theme}`, children: [_jsxs("div", { className: "ra4-hud-top-bar ra4-hud-interactive", style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx(HUDHeader, {}), _jsxs("div", { style: {
                            backgroundColor: inputMode === 'DirectUnitControl' ? '#ff2a4b' : inputMode === 'Console' ? '#00ffc8' : inputMode === 'FreeCamera' ? '#e0f7fc' : 'rgba(0, 255, 200, 0.2)',
                            color: inputMode === 'Console' || inputMode === 'FreeCamera' ? '#05101a' : '#ffffff',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            letterSpacing: '1px',
                            boxShadow: '0 0 10px rgba(0, 255, 200, 0.4)',
                            border: '1px solid #00ffc8'
                        }, children: [inputMode === 'RTS' && 'РЕЖИМ: RTS [F - Прямое управление | Space+ПКМ - Свободная камера | ~ Консоль]', inputMode === 'DirectUnitControl' && 'РЕЖИМ: ПРЯМОЕ УПРАВЛЕНИЕ (WASD / LMB Стрельба) [F / Esc - Выход]', inputMode === 'FreeCamera' && 'РЕЖИМ: СВОБОДНАЯ КАМЕРА (Вращение кнопкой мыши)', inputMode === 'Console' && 'РЕЖИМ: АДМИН-КОНСОЛЬ (~ / Esc - Закрыть)'] })] }), _jsx("div", { className: "ra4-hud-middle", children: _jsx(EVALog, {}) }), _jsxs("div", { className: "ra4-hud-bottom", children: [_jsx("div", { className: "ra4-hud-interactive", children: _jsx(Minimap, {}) }), _jsx("div", { className: "ra4-hud-interactive", style: { flex: 1, display: 'flex', justifyContent: 'center' }, children: _jsx(CommandBar, {}) }), _jsx("div", { className: "ra4-hud-interactive", children: _jsx(ProductionPanel, { onIssueCommand: onIssueCommand }) })] })] }));
};
//# sourceMappingURL=MainHUD.js.map