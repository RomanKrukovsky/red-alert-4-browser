import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const CampaignSelectScreen = ({ onSelectFaction, onBack }) => {
    const [selectedFaction, setSelectedFaction] = useState('USSR');
    const factions = [
        { id: 'USSR', name: 'СССР', subtitle: 'Советский Союз', progress: '58% Завершено', missions: '14/24', color: '#ff2a4b' },
        { id: 'ALLIES', name: 'АЛЬЯНС', subtitle: 'Западные Союзники', progress: '100% Завершено', missions: '18/18', color: '#2a8bf2' },
        { id: 'COALITION', name: 'ВОСТОЧНАЯ КОАЛИЦИЯ', subtitle: 'Паназиатский Пакт', progress: '0% Завершено', missions: '0/16', color: '#26b259' },
        { id: 'CHRONO', name: 'ХРОНОЛЕГИОН', subtitle: 'Стражи Времени', progress: '0% Завершено', missions: '0/12', color: '#9933da' }
    ];
    const current = factions.find(f => f.id === selectedFaction) ?? factions[0];
    return (_jsxs("div", { style: containerStyle, children: [_jsxs("div", { style: headerStyle, children: [_jsx("button", { style: backBtnStyle, onClick: onBack, children: "\u25C4 \u041D\u0410\u0417\u0410\u0414 \u0412 \u041C\u0415\u041D\u042E" }), _jsx("h2", { style: { color: '#00ffc8', margin: 0, fontFamily: 'Orbitron, sans-serif' }, children: "\u0412\u042B\u0411\u041E\u0420 \u0422\u0415\u0410\u0422\u0420\u0410 \u0412\u041E\u0415\u041D\u041D\u042B\u0425 \u0414\u0415\u0419\u0421\u0422\u0412\u0418\u0419" }), _jsx("div", { style: { width: '120px' } })] }), _jsx("div", { style: gridStyle, children: factions.map(f => (_jsxs("div", { onClick: () => setSelectedFaction(f.id), style: {
                        ...cardStyle,
                        borderColor: selectedFaction === f.id ? f.color : 'rgba(255, 255, 255, 0.15)',
                        boxShadow: selectedFaction === f.id ? `0 0 25px ${f.color}` : 'none'
                    }, children: [_jsx("div", { style: { fontSize: '12px', color: f.color, fontWeight: 'bold' }, children: f.subtitle }), _jsx("h3", { style: { fontSize: '22px', margin: '6px 0', color: '#fff', fontFamily: 'Orbitron, sans-serif' }, children: f.name }), _jsxs("div", { style: { fontSize: '13px', color: '#aaa', marginTop: '10px' }, children: ["\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441: ", f.progress] }), _jsxs("div", { style: { fontSize: '12px', color: '#888' }, children: ["\u041C\u0438\u0441\u0441\u0438\u0438: ", f.missions] })] }, f.id))) }), _jsxs("div", { style: detailPanelStyle, children: [_jsxs("h3", { style: { color: current.color, marginTop: 0, fontFamily: 'Orbitron, sans-serif' }, children: [current.name, " \u2014 \u0414\u0415\u0422\u0410\u041B\u0418 \u041A\u0410\u041C\u041F\u0410\u041D\u0418\u0418"] }), _jsxs("p", { style: { color: '#ccc', fontSize: '14px', lineHeight: 1.6 }, children: ["\u0412\u043E\u0437\u0433\u043B\u0430\u0432\u044C\u0442\u0435 \u0430\u0440\u043C\u0438\u044E ", current.subtitle, " \u0432 \u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u043E\u043C \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0438. \u041F\u0440\u043E\u0439\u0434\u0438\u0442\u0435 ", current.missions, " \u0442\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0445 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0439 \u0441 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u043C\u0438 \u0442\u0438\u043F\u0430\u043C\u0438 \u0432\u043E\u0439\u0441\u043A \u0438 \u0441\u0443\u043F\u0435\u0440\u043E\u0440\u0443\u0436\u0438\u0435\u043C."] }), _jsxs("button", { style: { ...launchBtnStyle, backgroundColor: current.color }, onClick: () => onSelectFaction(current.id), children: ["\u25BA \u041D\u0410\u0427\u0410\u0422\u042C \u041A\u0410\u041C\u041F\u0410\u041D\u0418\u042E ", current.name] })] })] }));
};
const containerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#070b12',
    display: 'flex',
    flexDirection: 'column',
    padding: '30px 40px',
    boxSizing: 'border-box',
    zIndex: 3600,
    fontFamily: 'Inter, system-ui, sans-serif'
};
const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
};
const backBtnStyle = {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ccc',
    padding: '10px 18px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
};
const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '30px'
};
const cardStyle = {
    backgroundColor: 'rgba(12, 18, 28, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
};
const detailPanelStyle = {
    backgroundColor: 'rgba(12, 18, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '30px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
};
const launchBtnStyle = {
    alignSelf: 'flex-start',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Orbitron, sans-serif'
};
//# sourceMappingURL=CampaignSelectScreen.js.map