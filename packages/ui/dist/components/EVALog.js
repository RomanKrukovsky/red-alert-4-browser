import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useUIStore } from '../store.js';
export const EVALog = () => {
    const logs = useUIStore((s) => s.evaLogs);
    return (_jsx("div", { style: {
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
        }, children: logs.map(log => (_jsxs("div", { style: {
                color: log.type === 'DANGER' ? '#ff4d4d' : log.type === 'WARN' ? '#ffd700' : '#00ffc8'
            }, children: ["[", log.timestamp, "] EVA: ", log.message] }, log.id))) }));
};
//# sourceMappingURL=EVALog.js.map