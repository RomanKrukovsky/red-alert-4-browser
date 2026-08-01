import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useUIStore } from '../store.js';
export const EVALog = () => {
    const evaLogs = useUIStore((state) => state.evaLogs);
    const containerRef = useRef(null);
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [evaLogs]);
    const getColor = (type) => {
        switch (type) {
            case 'DANGER':
                return '#ff3344';
            case 'WARN':
                return '#ffcc00';
            case 'INFO':
            default:
                return '#00ffc8';
        }
    };
    return (_jsx("div", { ref: containerRef, className: "ra4-eva-log", style: {
            width: '380px',
            maxHeight: '130px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '12px',
            fontFamily: 'var(--font-family-mono, monospace)',
            letterSpacing: 'var(--letter-spacing-wide, 0.05em)',
            pointerEvents: 'none',
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
            padding: '6px 10px',
            background: 'rgba(5, 15, 25, 0.65)',
            borderLeft: '2px solid #00ffc8',
            borderRadius: '0 4px 4px 0',
            boxShadow: '0 0 10px rgba(0, 255, 200, 0.15)',
            backdropFilter: 'blur(4px)',
        }, children: evaLogs.map((log) => (_jsxs("div", { style: { color: getColor(log.type), display: 'flex', gap: '8px' }, children: [_jsxs("span", { style: { opacity: 0.6, fontSize: '10px' }, children: ["[", log.timestamp, "]"] }), _jsx("span", { children: log.message })] }, log.id))) }));
};
//# sourceMappingURL=EVALog.js.map