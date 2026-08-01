import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUIStore } from '../store.js';
import { OFFICIAL_FACTIONS } from '@ra4/content-runtime';
import { Button } from './Button.js';
export const HUDHeader = () => {
    const snapshot = useUIStore((s) => s.snapshot);
    const playerIdx = useUIStore((s) => s.activePlayerIndex);
    const toggleMenu = useUIStore((s) => s.toggleMenu);
    const playerState = snapshot?.players[playerIdx] ?? {
        credits: 10000,
        powerProduced: 100,
        powerConsumed: 0,
        powerLow: false,
        commandCapUsed: 0,
        commandCapMax: 50,
        factionResource: 0
    };
    const factionSpec = OFFICIAL_FACTIONS[playerIdx % 4];
    return (_jsxs("div", { className: "ra4-frame", style: {
            width: '100%',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 30px',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 20px 100%, 0 calc(100% - 20px))' // angled bottom-left
        }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: '20px' }, children: _jsx("div", { style: { fontSize: '20px', fontWeight: 900, letterSpacing: '2px', color: 'var(--faction-secondary)' }, children: factionSpec.name.toUpperCase() }) }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '40px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("span", { style: { fontSize: '24px' }, children: "\uD83E\uDE99" }), _jsx("span", { className: "ra4-tabular-num", style: { fontSize: '24px', fontWeight: 900, color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }, children: playerState.credits.toLocaleString() })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("span", { style: { fontSize: '24px', color: playerState.powerLow ? '#ff0000' : '#00ff00' }, children: "\u26A1" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column' }, children: _jsxs("span", { className: "ra4-tabular-num", style: { fontSize: '18px', fontWeight: 900, color: playerState.powerLow ? '#ff4d4d' : '#4dff88' }, children: [playerState.powerConsumed, " / ", playerState.powerProduced] }) })] })] }), _jsx("div", { style: { display: 'flex', alignItems: 'center', gap: '20px' }, children: _jsx(Button, { variant: "primary", onClick: toggleMenu, style: { padding: '10px 30px', fontSize: '14px' }, children: "\u041C\u0415\u041D\u042E (ESC)" }) })] }));
};
//# sourceMappingURL=HUDHeader.js.map