import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUIStore } from '../store.js';
import { OFFICIAL_BUILDINGS, OFFICIAL_UNITS } from '@ra4/content-runtime';
import { FactionId, CommandType } from '@ra4/shared-types';
export const ProductionPanel = ({ onIssueCommand }) => {
    const activeTab = useUIStore((s) => s.activeCategoryTab);
    const setActiveTab = useUIStore((s) => s.setActiveCategoryTab);
    const snapshot = useUIStore((s) => s.snapshot);
    const playerIdx = useUIStore((s) => s.activePlayerIndex);
    const playerState = snapshot?.players[playerIdx];
    const playerFaction = snapshot?.entities.find(e => e.playerIndex === playerIdx)?.factionId ?? FactionId.USSR;
    const buildings = OFFICIAL_BUILDINGS.filter(b => b.factionId === playerFaction);
    const units = OFFICIAL_UNITS.filter(u => u.factionId === playerFaction);
    const handleBuildStructure = (structId) => {
        onIssueCommand?.({
            type: CommandType.BUILD_STRUCTURE,
            structureId: structId,
            gridX: 20,
            gridY: 20,
            playerIndex: playerIdx,
            entityIds: [],
            tick: snapshot?.tick ?? 0
        });
    };
    const handleProduceUnit = (unitId) => {
        // Find producing building
        const producer = snapshot?.entities.find(e => e.playerIndex === playerIdx && e.isBuilding);
        if (producer) {
            onIssueCommand?.({
                type: CommandType.PRODUCE_UNIT,
                producerEntityId: producer.id,
                unitId,
                playerIndex: playerIdx,
                entityIds: [],
                tick: snapshot?.tick ?? 0
            });
        }
    };
    return (_jsxs("div", { style: {
            width: '260px',
            background: 'rgba(12, 18, 28, 0.95)',
            borderLeft: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            flexDirection: 'column',
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif'
        }, children: [_jsx("div", { style: { display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }, children: ['BUILDINGS', 'INFANTRY', 'VEHICLES', 'AIR', 'NAVAL'].map(tab => (_jsx("button", { onClick: () => setActiveTab(tab), style: {
                        flex: 1,
                        padding: '8px 2px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: activeTab === tab ? 'rgba(255,77,77,0.2)' : 'transparent',
                        color: activeTab === tab ? '#ff4d4d' : '#888',
                        border: 'none',
                        borderBottom: activeTab === tab ? '2px solid #ff4d4d' : 'none',
                        cursor: 'pointer'
                    }, children: tab[0] }, tab))) }), _jsxs("div", { style: { flex: 1, padding: '10px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }, children: [activeTab === 'BUILDINGS' && buildings.map(b => (_jsxs("button", { onClick: () => handleBuildStructure(b.id), style: {
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            padding: '8px',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                        }, children: [_jsx("div", { style: { fontSize: '11px', fontWeight: 700, textAlign: 'center' }, children: b.name }), _jsxs("div", { style: { fontSize: '10px', color: '#ffd700' }, children: [b.cost, " \u20A1"] })] }, b.id))), activeTab !== 'BUILDINGS' && units.map(u => (_jsxs("button", { onClick: () => handleProduceUnit(u.id), style: {
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            padding: '8px',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px'
                        }, children: [_jsx("div", { style: { fontSize: '11px', fontWeight: 700, textAlign: 'center' }, children: u.name }), _jsxs("div", { style: { fontSize: '10px', color: '#ffd700' }, children: [u.cost, " \u20A1"] })] }, u.id)))] })] }));
};
//# sourceMappingURL=ProductionPanel.js.map