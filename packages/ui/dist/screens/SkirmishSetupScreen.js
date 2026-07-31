import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const SkirmishSetupScreen = ({ onStartMatch, onBack }) => {
    const [selectedMap, setSelectedMap] = useState('Красный Рубеж (64x64)');
    const [playerFaction, setPlayerFaction] = useState('USSR');
    const [aiFaction, setAiFaction] = useState('ALLIANCE');
    const [aiDifficulty, setAiDifficulty] = useState('MEDIUM');
    return (_jsxs("div", { style: containerStyle, children: [_jsxs("div", { style: headerStyle, children: [_jsx("button", { style: backBtnStyle, onClick: onBack, children: "\u25C4 \u041D\u0410\u0417\u0410\u0414 \u0412 \u041C\u0415\u041D\u042E" }), _jsx("h2", { style: { color: '#00ffc8', margin: 0, fontFamily: 'Orbitron, sans-serif' }, children: "\u041D\u0410\u0421\u0422\u0420\u041E\u0419\u041A\u0410 \u041C\u0410\u0422\u0427\u0410 \u00AB\u0421\u0425\u0412\u0410\u0422\u041A\u0410\u00BB" }), _jsx("div", { style: { width: '120px' } })] }), _jsxs("div", { style: bodyStyle, children: [_jsxs("div", { style: mapBoxStyle, children: [_jsx("div", { style: panelTitleStyle, children: "\u041A\u0410\u0420\u0422\u0410 \u0422\u0415\u0410\u0422\u0420\u0410 \u0412\u041E\u0415\u041D\u041D\u042B\u0425 \u0414\u0415\u0419\u0421\u0422\u0412\u0418\u0419" }), _jsx("div", { style: mapListStyle, children: ['Красный Рубеж (64x64)', 'Заполярный Порт (128x128)', 'Пустынный Узел (96x96)'].map(m => (_jsx("div", { onClick: () => setSelectedMap(m), style: {
                                        ...mapItemStyle,
                                        borderColor: selectedMap === m ? '#00ffc8' : 'rgba(255, 255, 255, 0.1)',
                                        backgroundColor: selectedMap === m ? 'rgba(0, 255, 200, 0.15)' : 'rgba(255, 255, 255, 0.03)'
                                    }, children: m }, m))) }), _jsxs("div", { style: mapPreviewBoxStyle, children: [_jsx("div", { style: { fontSize: '12px', color: '#888' }, children: "\u041F\u0420\u0415\u0412\u042C\u042E \u041A\u0410\u0420\u0422\u042B" }), _jsx("div", { style: { fontWeight: 'bold', color: '#00ffc8', marginTop: '4px' }, children: selectedMap })] })] }), _jsxs("div", { style: slotsBoxStyle, children: [_jsx("div", { style: panelTitleStyle, children: "\u0423\u0427\u0410\u0421\u0422\u041D\u0418\u041A\u0418 \u041C\u0410\u0422\u0427\u0410" }), _jsxs("div", { style: slotRowStyle, children: [_jsx("div", { style: { width: '120px', fontWeight: 'bold', color: '#fff' }, children: "\u0418\u0413\u0420\u041E\u041A 1" }), _jsxs("select", { style: selectStyle, value: playerFaction, onChange: e => setPlayerFaction(e.target.value), children: [_jsx("option", { value: "USSR", children: "\u0421\u0421\u0421\u0420 (\u0421\u043E\u0432\u0435\u0442\u0441\u043A\u0438\u0439 \u0421\u043E\u044E\u0437)" }), _jsx("option", { value: "ALLIANCE", children: "\u0410\u041B\u042C\u042F\u041D\u0421 (\u0417\u0430\u043F\u0430\u0434\u043D\u044B\u0435 \u0421\u043E\u044E\u0437\u043D\u0438\u043A\u0438)" }), _jsx("option", { value: "COALITION", children: "\u0412\u041E\u0421\u0422\u041E\u0427\u041D\u0410\u042F \u041A\u041E\u0410\u041B\u0418\u0426\u0418\u042F" }), _jsx("option", { value: "CHRONO", children: "\u0425\u0420\u041E\u041D\u041E\u041B\u0415\u0413\u0418\u041E\u041D" })] }), _jsx("div", { style: { color: '#ff2a4b', fontWeight: 'bold' }, children: "\u041A\u041E\u041C\u0410\u041D\u0414\u0410 1" })] }), _jsxs("div", { style: slotRowStyle, children: [_jsx("div", { style: { width: '120px', fontWeight: 'bold', color: '#aaa' }, children: "\u0418\u0418-\u0421\u041E\u041F\u0415\u0420\u041D\u0418\u041A" }), _jsxs("select", { style: selectStyle, value: aiFaction, onChange: e => setAiFaction(e.target.value), children: [_jsx("option", { value: "ALLIANCE", children: "\u0410\u041B\u042C\u042F\u041D\u0421 (\u0417\u0430\u043F\u0430\u0434\u043D\u044B\u0435 \u0421\u043E\u044E\u0437\u043D\u0438\u043A\u0438)" }), _jsx("option", { value: "USSR", children: "\u0421\u0421\u0421\u0420 (\u0421\u043E\u0432\u0435\u0442\u0441\u043A\u0438\u0439 \u0421\u043E\u044E\u0437)" }), _jsx("option", { value: "COALITION", children: "\u0412\u041E\u0421\u0422\u041E\u0427\u041D\u0410\u042F \u041A\u041E\u0410\u041B\u0418\u0426\u0418\u042F" }), _jsx("option", { value: "CHRONO", children: "\u0425\u0420\u041E\u041D\u041E\u041B\u0415\u0413\u0418\u041E\u041D" })] }), _jsxs("select", { style: selectStyle, value: aiDifficulty, onChange: e => setAiDifficulty(e.target.value), children: [_jsx("option", { value: "EASY", children: "\u041B\u0435\u0433\u043A\u0438\u0439 \u0418\u0418" }), _jsx("option", { value: "MEDIUM", children: "\u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0418\u0418" }), _jsx("option", { value: "HARD", children: "\u0422\u044F\u0436\u0435\u043B\u044B\u0439 \u0418\u0418" })] }), _jsx("div", { style: { color: '#2a8bf2', fontWeight: 'bold' }, children: "\u041A\u041E\u041C\u0410\u041D\u0414\u0410 2" })] })] }), _jsxs("div", { style: rulesBoxStyle, children: [_jsx("div", { style: panelTitleStyle, children: "\u041F\u0420\u0410\u0412\u0418\u041B\u0410 \u0418 \u0421\u0415\u0420\u0412\u0415\u0420" }), _jsxs("div", { style: ruleRowStyle, children: ["\u0421\u0442\u0430\u0440\u0442\u043E\u0432\u044B\u0435 \u0441\u0440\u0435\u0434\u0441\u0442\u0432\u0430: ", _jsx("span", { style: { color: '#ffd700', fontWeight: 'bold' }, children: "10 000 \u20A1" })] }), _jsxs("div", { style: ruleRowStyle, children: ["\u0422\u0443\u043C\u0430\u043D \u0432\u043E\u0439\u043D\u044B: ", _jsx("span", { style: { color: '#00ffc8', fontWeight: 'bold' }, children: "\u0412\u041A\u041B\u042E\u0427\u0415\u041D" })] }), _jsxs("div", { style: ruleRowStyle, children: ["\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0438\u0433\u0440\u044B: ", _jsx("span", { style: { color: '#fff', fontWeight: 'bold' }, children: "1.0x (30 FPS Lockstep)" })] }), _jsxs("div", { style: ruleRowStyle, children: ["\u0421\u0443\u043F\u0435\u0440\u043E\u0440\u0443\u0436\u0438\u0435: ", _jsx("span", { style: { color: '#00ffc8', fontWeight: 'bold' }, children: "\u0420\u0410\u0417\u0420\u0415\u0428\u0415\u041D\u041E" })] })] })] }), _jsx("div", { style: footerStyle, children: _jsx("button", { style: startBtnStyle, onClick: onStartMatch, children: "\u25BA \u041D\u0410\u0427\u0410\u0422\u042C \u041C\u0410\u0422\u0427 \u00AB\u0421\u0425\u0412\u0410\u0422\u041A\u0410\u00BB" }) })] }));
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
    zIndex: 3700,
    fontFamily: 'Inter, system-ui, sans-serif'
};
const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
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
const bodyStyle = {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '300px 1fr 300px',
    gap: '24px'
};
const panelTitleStyle = {
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    color: '#888',
    marginBottom: '14px'
};
const mapBoxStyle = {
    backgroundColor: 'rgba(12, 18, 28, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column'
};
const mapListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1
};
const mapItemStyle = {
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid transparent',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer'
};
const mapPreviewBoxStyle = {
    marginTop: '15px',
    height: '120px',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    border: '1px dashed rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
};
const slotsBoxStyle = {
    backgroundColor: 'rgba(12, 18, 28, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
};
const slotRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px'
};
const selectStyle = {
    backgroundColor: '#0c101a',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '13px'
};
const rulesBoxStyle = {
    backgroundColor: 'rgba(12, 18, 28, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
};
const ruleRowStyle = {
    fontSize: '13px',
    color: '#ccc'
};
const footerStyle = {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'flex-end'
};
const startBtnStyle = {
    backgroundColor: '#00ffc8',
    color: '#05080f',
    border: 'none',
    borderRadius: '4px',
    padding: '16px 36px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Orbitron, sans-serif'
};
//# sourceMappingURL=SkirmishSetupScreen.js.map