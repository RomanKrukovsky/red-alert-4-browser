import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useWindowStore } from '../windowStore.js';
import { useUIStore } from '../store.js';
export const Taskbar = () => {
    const windows = useWindowStore((s) => s.windows);
    const setMinimized = useWindowStore((s) => s.setMinimized);
    const bringToFront = useWindowStore((s) => s.bringToFront);
    const setClosed = useWindowStore((s) => s.setClosed);
    const theme = useUIStore((s) => s.theme);
    const windowList = Object.values(windows);
    if (windowList.length === 0)
        return null;
    return (_jsxs("div", { className: `ra4-taskbar ${theme}`, style: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '40px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderTop: '2px solid rgba(0, 255, 200, 0.3)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            gap: '8px',
            zIndex: 1000,
            pointerEvents: 'auto',
        }, children: [_jsx("div", { className: "ra4-taskbar-start", style: {
                    fontWeight: 'bold',
                    color: '#00ffc8',
                    marginRight: '16px',
                    textTransform: 'uppercase',
                    fontSize: '14px',
                    letterSpacing: '1px'
                }, children: "\u0421\u0438\u0441\u0442\u0435\u043C\u0430 \u041E\u0421" }), windowList.map((w) => {
                if (w.closed)
                    return null;
                return (_jsx("button", { className: `ra4-taskbar-btn ${w.minimized ? 'is-minimized' : 'is-active'}`, onClick: () => {
                        if (w.minimized) {
                            setMinimized(w.id, false);
                            bringToFront(w.id);
                        }
                        else {
                            setMinimized(w.id, true);
                        }
                    }, style: {
                        padding: '6px 16px',
                        backgroundColor: w.minimized ? 'rgba(40, 40, 40, 0.8)' : 'rgba(0, 255, 200, 0.2)',
                        border: `1px solid ${w.minimized ? '#555' : '#00ffc8'}`,
                        color: w.minimized ? '#aaa' : '#fff',
                        cursor: 'pointer',
                        borderRadius: '2px',
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: '12px',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }, children: w.title }, w.id));
            })] }));
};
//# sourceMappingURL=Taskbar.js.map