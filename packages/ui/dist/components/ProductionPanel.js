import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUIStore } from '../store.js';
import { OFFICIAL_BUILDINGS, OFFICIAL_UNITS } from '@ra4/content-runtime';
import { FactionId } from '@ra4/shared-types';
import { Frame } from './Frame.js';
export const ProductionPanel = ({ onIssueCommand }) => {
    const activeTab = useUIStore((s) => s.activeCategoryTab);
    const setActiveTab = useUIStore((s) => s.setActiveCategoryTab);
    const snapshot = useUIStore((s) => s.snapshot);
    const playerIdx = useUIStore((s) => s.activePlayerIndex);
    const playerState = snapshot?.players[playerIdx];
    const playerFaction = snapshot?.entities.find(e => e.playerIndex === playerIdx)?.factionId ?? FactionId.USSR;
    const buildings = OFFICIAL_BUILDINGS.filter(b => b.factionId === playerFaction);
    const units = OFFICIAL_UNITS.filter(u => u.factionId === playerFaction);
    return (_jsxs(Frame, { className: "ra4-production-panel", style: {
            width: '320px',
            height: 'calc(100vh - 80px)',
            display: 'flex',
            flexDirection: 'column',
            borderRight: 'none',
            borderBottom: 'none',
            clipPath: 'polygon(20px 0, 100% 0, 100% 100%, 0 100%, 0 20px)'
        }, children: [_jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', background: 'rgba(0,0,0,0.5)', marginBottom: '10px' }, children: ['BUILDINGS', 'INFANTRY', 'VEHICLES', 'AIR'].map(tab => (_jsx("button", { onClick: () => setActiveTab(tab), style: {
                        padding: '15px 5px',
                        fontSize: '11px',
                        fontWeight: 900,
                        background: activeTab === tab ? 'var(--faction-secondary)' : 'transparent',
                        color: activeTab === tab ? '#000' : 'var(--faction-text)',
                        border: 'none',
                        borderBottom: activeTab === tab ? 'none' : '1px solid var(--faction-dark)',
                        cursor: 'pointer'
                    }, children: tab.substring(0, 3) }, tab))) }), _jsxs("div", { style: { flex: 1, padding: '10px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignContent: 'start' }, children: [activeTab === 'BUILDINGS' && buildings.map(b => (_jsxs("div", { className: "ra4-build-item", style: {
                            background: 'rgba(0,0,0,0.8)',
                            border: '1px solid var(--faction-secondary)',
                            height: '100px',
                            position: 'relative',
                            cursor: 'pointer'
                        }, children: [_jsx("div", { style: { position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.8)', padding: '5px', fontSize: '11px', textAlign: 'center' }, children: b.name }), _jsx("div", { style: { position: 'absolute', top: '5px', right: '5px', color: '#ffd700', fontSize: '11px', fontWeight: 'bold' }, children: b.cost })] }, b.id))), activeTab !== 'BUILDINGS' && units.map(u => (_jsxs("div", { className: "ra4-build-item", style: {
                            background: 'rgba(0,0,0,0.8)',
                            border: '1px solid var(--faction-secondary)',
                            height: '100px',
                            position: 'relative',
                            cursor: 'pointer'
                        }, children: [_jsx("div", { style: { position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.8)', padding: '5px', fontSize: '11px', textAlign: 'center' }, children: u.name }), _jsx("div", { style: { position: 'absolute', top: '5px', right: '5px', color: '#ffd700', fontSize: '11px', fontWeight: 'bold' }, children: u.cost })] }, u.id)))] })] }));
};
//# sourceMappingURL=ProductionPanel.js.map