import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const MainMenuScreen = ({ onSelectOption }) => {
    const [activeItem, setActiveItem] = useState('СХВАТКА');
    const navItems = [
        { id: 'CAMPAIGN', label: '1. КАМПАНИЯ' },
        { id: 'MULTIPLAYER', label: '2. СЕТЕВАЯ ИГРА' },
        { id: 'SKIRMISH', label: '3. СХВАТКА' },
        { id: 'EDITOR', label: '4. РЕДАКТОР КАРТ' },
        { id: 'ENCYCLOPEDIA', label: '5. ЭНЦИКЛОПЕДИЯ' },
        { id: 'MODS', label: '6. МОДИФИКАЦИИ' },
        { id: 'SETTINGS', label: '7. НАСТРОЙКИ' },
        { id: 'EXIT', label: '8. ВЫХОД' }
    ];
    const handleNavClick = (id, label) => {
        setActiveItem(label);
        onSelectOption(id);
    };
    return (_jsxs("div", { style: containerStyle, children: [_jsxs("div", { style: topHeaderStyle, children: [_jsxs("div", { style: brandStyle, children: [_jsx("span", { style: { color: '#ff4d4d', fontWeight: 'bold' }, children: "RED ALERT 4" }), " \u2014 \u0413\u041B\u0410\u0412\u041D\u041E\u0415 \u041C\u0415\u041D\u042E"] }), _jsxs("div", { style: commanderCardStyle, children: [_jsx("div", { style: avatarBoxStyle, children: "\uD83C\uDF96\uFE0F" }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: '13px', fontWeight: 'bold', color: '#fff' }, children: "\u041A\u041E\u041C\u0410\u041D\u0414\u0418\u0420 \u0410\u041B\u0415\u041A\u0421\u0415\u0415\u0412" }), _jsx("div", { style: { fontSize: '11px', color: '#00ffc8' }, children: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C 25" }), _jsx("div", { style: xpTrackStyle, children: _jsx("div", { style: { width: '61%', height: '100%', backgroundColor: '#00ffc8' } }) }), _jsx("div", { style: { fontSize: '9px', color: '#888', marginTop: '2px' }, children: "45 780 / 75 000 XP" })] })] })] }), _jsxs("div", { style: middleStyle, children: [_jsx("div", { style: railStyle, children: navItems.map(item => (_jsx("button", { onClick: () => handleNavClick(item.id, item.label), style: {
                                ...navBtnStyle,
                                backgroundColor: activeItem === item.label ? 'rgba(0, 255, 200, 0.15)' : 'transparent',
                                borderColor: activeItem === item.label ? '#00ffc8' : 'transparent',
                                color: activeItem === item.label ? '#00ffc8' : '#ccc'
                            }, children: item.label }, item.id))) }), _jsxs("div", { style: opsPanelStyle, children: [_jsx("div", { style: opsHeaderStyle, children: "\u041E\u041F\u0415\u0420\u0410\u0422\u0418\u0412\u041D\u0410\u042F \u0421\u0412\u041E\u0414\u041A\u0410 \u0418 \u041D\u041E\u0412\u041E\u0421\u0422\u0418" }), _jsxs("div", { style: newsBoxStyle, children: [_jsx("h3", { style: { color: '#ff4d4d', margin: '0 0 8px 0' }, children: "\u041E\u041F\u0415\u0420\u0410\u0426\u0418\u042F \u00AB\u041A\u0420\u0410\u0421\u041D\u042B\u0419 \u0420\u0423\u0411\u0415\u0416\u00BB \u0414\u041E\u0421\u0422\u0423\u041F\u041D\u0410" }), _jsx("p", { style: { color: '#bbb', fontSize: '13px', lineHeight: 1.5, margin: 0 }, children: "\u041A\u043E\u043C\u0430\u043D\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0421\u0421\u0421\u0420 \u0441\u043E\u043E\u0431\u0449\u0430\u0435\u0442 \u043E \u0440\u0430\u0437\u0432\u0451\u0440\u0442\u044B\u0432\u0430\u043D\u0438\u0438 \u043F\u0435\u0440\u0435\u0434\u043E\u0432\u044B\u0445 \u0442\u044F\u0436\u0435\u043B\u044B\u0445 \u0442\u0430\u043D\u043A\u043E\u0432\u044B\u0445 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0439 \u041E\u0411\u0422-92 \u00AB\u0413\u0440\u0430\u043D\u0438\u0442\u00BB \u043D\u0430 \u0441\u0435\u0432\u0435\u0440\u043D\u043E\u043C \u0443\u0447\u0430\u0441\u0442\u043A\u0435 \u0444\u0440\u043E\u043D\u0442\u0430." }), _jsxs("div", { style: dotsStyle, children: [_jsx("span", { style: { color: '#00ffc8' }, children: "\u25CF" }), _jsx("span", { style: { color: '#555' }, children: "\u25CF" }), _jsx("span", { style: { color: '#555' }, children: "\u25CF" })] })] }), _jsxs("div", { style: summaryGridStyle, children: [_jsxs("div", { style: cardStyle, children: [_jsx("div", { style: cardTitleStyle, children: "\u0422\u0415\u041A\u0423\u0429\u0418\u0419 \u0420\u0415\u0416\u0418\u041C" }), _jsx("div", { style: { fontSize: '16px', fontWeight: 'bold', color: '#00ffc8' }, children: "\u041E\u0434\u0438\u043D\u043E\u0447\u043D\u0430\u044F \u0421\u0445\u0432\u0430\u0442\u043A\u0430" })] }), _jsxs("div", { style: cardStyle, children: [_jsx("div", { style: cardTitleStyle, children: "\u041A\u0410\u0420\u0422\u0410" }), _jsx("div", { style: { fontSize: '16px', fontWeight: 'bold', color: '#fff' }, children: "\u041A\u0440\u0430\u0441\u043D\u044B\u0439 \u0420\u0443\u0431\u0435\u0436 (64x64)" })] })] })] })] }), _jsxs("div", { style: footerStyle, children: [_jsxs("div", { children: ["\u0421\u0415\u0422\u042C: ", _jsx("span", { style: { color: '#00ffc8' }, children: "\u041E\u041D\u041B\u0410\u0419\u041D" })] }), _jsxs("div", { children: ["\u0417\u0410\u0414\u0415\u0420\u0416\u041A\u0410: ", _jsx("span", { style: { color: '#00ffc8' }, children: "24 ms" })] }), _jsxs("div", { children: ["\u0412\u0415\u0420\u0421\u0418\u042F \u0414\u0412\u0418\u0416\u041A\u0410: ", _jsx("span", { style: { color: '#aaa' }, children: "RA4 v2.0.4 (WebGPU / PBR)" })] })] })] }));
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
    justifyContent: 'space-between',
    fontFamily: 'Inter, system-ui, sans-serif',
    zIndex: 3500
};
const topHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(12, 18, 28, 0.8)'
};
const brandStyle = {
    fontSize: '18px',
    letterSpacing: '2px',
    color: '#fff'
};
const commanderCardStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
};
const avatarBoxStyle = {
    fontSize: '24px'
};
const xpTrackStyle = {
    width: '140px',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginTop: '4px'
};
const middleStyle = {
    flex: 1,
    display: 'flex',
    padding: '30px 40px',
    gap: '40px'
};
const railStyle = {
    width: '280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
};
const navBtnStyle = {
    padding: '14px 20px',
    textAlign: 'left',
    fontSize: '15px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    borderRadius: '4px',
    borderLeft: '4px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
};
const opsPanelStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
};
const opsHeaderStyle = {
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    color: '#888'
};
const newsBoxStyle = {
    backgroundColor: 'rgba(12, 18, 28, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '24px',
    position: 'relative'
};
const dotsStyle = {
    marginTop: '16px',
    display: 'flex',
    gap: '6px'
};
const summaryGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
};
const cardStyle = {
    backgroundColor: 'rgba(12, 18, 28, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    padding: '16px'
};
const cardTitleStyle = {
    fontSize: '11px',
    color: '#888',
    marginBottom: '6px'
};
const footerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 40px',
    backgroundColor: 'rgba(5, 8, 15, 0.95)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '12px',
    color: '#888'
};
//# sourceMappingURL=MainMenuScreen.js.map