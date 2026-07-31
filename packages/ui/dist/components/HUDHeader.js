import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useUIStore } from '../store.js';
import { OFFICIAL_FACTIONS } from '@ra4/content-runtime';
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
    return (_jsxs("div", { style: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '52px',
            background: 'linear-gradient(180deg, rgba(12,18,28,0.95) 0%, rgba(12,18,28,0.75) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            zIndex: 1000,
            userSelect: 'none'
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '20px' }, children: [_jsxs("div", { style: { fontSize: '18px', fontWeight: 800, letterSpacing: '1px', color: '#ff4d4d' }, children: ["RA4 // ", factionSpec.name.toUpperCase()] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '2px' }, children: [_jsx("div", { style: { fontSize: '10px', color: '#aaa', textTransform: 'uppercase' }, children: factionSpec.resourceName }), _jsx("div", { style: {
                                    width: '140px',
                                    height: '10px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }, children: _jsx("div", { style: {
                                        width: `${playerState.factionResource}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #ff9900, #ff4d4d)'
                                    } }) })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '30px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '20px' }, children: "\uD83E\uDE99" }), _jsxs("span", { style: { fontSize: '20px', fontWeight: 700, color: '#ffd700' }, children: [playerState.credits.toLocaleString(), " \u20A1"] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '18px' }, children: "\u26A1" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column' }, children: [_jsxs("span", { style: { fontSize: '14px', fontWeight: 700, color: playerState.powerLow ? '#ff4d4d' : '#4dff88' }, children: [playerState.powerConsumed, " / ", playerState.powerProduced, " MW"] }), playerState.powerLow && (_jsx("span", { style: { fontSize: '9px', color: '#ff4d4d', fontWeight: 800 }, children: "\u0414\u0415\u0424\u0418\u0426\u0418\u0422 \u042D\u041D\u0415\u0420\u0413\u0418\u0418" }))] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '18px' }, children: "\uD83C\uDF96\uFE0F" }), _jsxs("span", { style: { fontSize: '14px', fontWeight: 700, color: '#4dc3ff' }, children: ["\u041B\u0418\u041C\u0418\u0422: ", playerState.commandCapUsed, " / ", playerState.commandCapMax] })] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '15px' }, children: [_jsxs("div", { style: { fontSize: '14px', fontFamily: 'monospace', color: '#888' }, children: ["TICK: ", snapshot?.tick ?? 0] }), _jsx("button", { onClick: toggleMenu, style: {
                            background: 'linear-gradient(135deg, #334, #223)',
                            border: '1px solid #556',
                            color: '#fff',
                            padding: '6px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '12px',
                            textTransform: 'uppercase'
                        }, children: "\u041C\u0415\u041D\u042E" })] })] }));
};
//# sourceMappingURL=HUDHeader.js.map