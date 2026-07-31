import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const ASSET_CATALOG = [
    { id: 'SU_GranitMBT', name: 'ОБТ-92 «Гранит»', category: 'unit', tris: 5800, matCount: 3, sockets: ['TurretYaw', 'GunPitch', 'Muzzle', 'SelectionAnchor'] },
    { id: 'SU_BogatyrOreCarrier', name: 'ГРМ-8 «Богатырь»', category: 'unit', tris: 4500, matCount: 3, sockets: ['HarvesterContainer', 'SelectionAnchor'] },
    { id: 'SU_RubezhRifleman', name: 'МС-12 «Рубеж»', category: 'unit', tris: 5900, matCount: 3, sockets: ['AssaultRifle', 'Muzzle', 'SelectionAnchor'] },
    { id: 'SU_HeavyFactory', name: 'Тяжёлый завод', category: 'building', tris: 4600, matCount: 3, sockets: ['SmokeStack1', 'VehicleBay', 'SelectionAnchor'] },
    { id: 'SU_Pillbox', name: 'Пулемётный дот', category: 'building', tris: 4500, matCount: 3, sockets: ['TwinTurret', 'SelectionAnchor'] },
    { id: 'pine_tree_01', name: 'Сосна высокое разрешение', category: 'environment', tris: 3000, matCount: 2, sockets: ['Canopy'] },
    { id: 'coast_rocks_01', name: 'Прибрежная скала', category: 'environment', tris: 1600, matCount: 1, sockets: ['RockMesh'] },
    { id: 'concrete_road_barrier', name: 'Бетонный барьер', category: 'prop', tris: 1600, matCount: 1, sockets: ['BarrierMesh'] },
    { id: 'old_military_crate', name: 'Военный ящик', category: 'prop', tris: 1600, matCount: 1, sockets: ['CrateMesh'] }
];
export const AssetGallery = ({ onClose }) => {
    const [selectedAssetId, setSelectedAssetId] = useState(ASSET_CATALOG[0].id);
    const [wireframe, setWireframe] = useState(false);
    const [showBoundingBox, setShowBoundingBox] = useState(true);
    const selectedAsset = ASSET_CATALOG.find(a => a.id === selectedAssetId) ?? ASSET_CATALOG[0];
    return (_jsxs("div", { style: overlayStyle, children: [_jsxs("div", { style: sidebarStyle, children: [_jsx("h2", { style: { color: '#00ffc8', margin: '0 0 15px 0', fontSize: '20px' }, children: "\uD83D\uDD0D RA4 3D ASSET GALLERY" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }, children: ASSET_CATALOG.map(asset => (_jsxs("button", { onClick: () => setSelectedAssetId(asset.id), style: {
                                textAlign: 'left',
                                padding: '10px 14px',
                                background: selectedAssetId === asset.id ? 'rgba(0, 255, 200, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                border: selectedAssetId === asset.id ? '1px solid #00ffc8' : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                color: '#fff',
                                cursor: 'pointer'
                            }, children: [_jsx("div", { style: { fontWeight: 'bold', fontSize: '13px' }, children: asset.name }), _jsxs("div", { style: { fontSize: '11px', color: '#888' }, children: [asset.id, " (", asset.category, ")"] })] }, asset.id))) }), _jsx("button", { style: closeBtnStyle, onClick: onClose, children: "\u2715 \u0417\u0410\u041A\u0420\u042B\u0422\u042C \u0413\u0410\u041B\u0415\u0420\u0415\u042E" })] }), _jsxs("div", { style: detailsPanelStyle, children: [_jsx("h3", { style: { color: '#00ffc8', marginTop: 0 }, children: "\u0410\u0441\u0441\u0435\u043C\u0431\u043B\u0438\u043D\u0433 \u0438 \u0421\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F 3D GLB" }), _jsx("table", { style: tableStyle, children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("td", { children: "ID \u0410\u0441\u0441\u0435\u0442\u0430:" }), _jsx("td", { style: valStyle, children: selectedAsset.id })] }), _jsxs("tr", { children: [_jsx("td", { children: "\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F:" }), _jsx("td", { style: valStyle, children: selectedAsset.category })] }), _jsxs("tr", { children: [_jsx("td", { children: "\u0422\u0440\u0435\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A\u0438 (LOD0):" }), _jsxs("td", { style: { ...valStyle, color: '#ffd700' }, children: [selectedAsset.tris.toLocaleString(), " tris"] })] }), _jsxs("tr", { children: [_jsx("td", { children: "\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u043E\u0432:" }), _jsxs("td", { style: valStyle, children: [selectedAsset.matCount, " PBR set"] })] }), _jsxs("tr", { children: [_jsx("td", { children: "\u0423\u0437\u043B\u044B / \u0422\u043E\u0447\u043A\u0438 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438 (Sockets):" }), _jsx("td", { style: valStyle, children: selectedAsset.sockets.join(', ') })] }), _jsxs("tr", { children: [_jsx("td", { children: "\u0421\u0442\u0430\u0442\u0443\u0441 \u041B\u0438\u0446\u0435\u043D\u0437\u0438\u0438:" }), _jsx("td", { style: { ...valStyle, color: '#00ffc8' }, children: "APPROVED (CC0 / Custom RA4 PBR)" })] })] }) }), _jsxs("div", { style: { marginTop: '20px', display: 'flex', gap: '15px' }, children: [_jsxs("label", { style: checkLabelStyle, children: [_jsx("input", { type: "checkbox", checked: wireframe, onChange: e => setWireframe(e.target.checked) }), "\u041A\u0430\u0440\u043A\u0430\u0441\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C (Wireframe)"] }), _jsxs("label", { style: checkLabelStyle, children: [_jsx("input", { type: "checkbox", checked: showBoundingBox, onChange: e => setShowBoundingBox(e.target.checked) }), "\u0413\u0430\u0431\u0430\u0440\u0438\u0442\u043D\u044B\u0439 \u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 (Bounding Box)"] })] })] })] }));
};
const overlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(5, 8, 15, 0.92)',
    display: 'flex',
    zIndex: 3000,
    fontFamily: 'Inter, system-ui, sans-serif'
};
const sidebarStyle = {
    width: '320px',
    backgroundColor: '#0c101a',
    borderRight: '1px solid #1e293b',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column'
};
const detailsPanelStyle = {
    flex: 1,
    padding: '30px',
    color: '#fff'
};
const closeBtnStyle = {
    marginTop: '15px',
    padding: '12px',
    background: '#ff4444',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer'
};
const tableStyle = {
    width: '100%',
    maxWidth: '600px',
    borderCollapse: 'collapse',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '6px'
};
const valStyle = {
    fontWeight: 'bold',
    padding: '8px 12px'
};
const checkLabelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px'
};
//# sourceMappingURL=AssetGallery.js.map