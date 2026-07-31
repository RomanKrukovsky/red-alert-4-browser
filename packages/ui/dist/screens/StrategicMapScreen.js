import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const StrategicMapScreen = ({ onSelectMission, onBack }) => {
    const [selectedNode, setSelectedNode] = useState('M1');
    const nodes = [
        { id: 'M1', name: 'Операция 1: Красный Рубеж', status: 'ACTIVE', pos: { x: 25, y: 35 } },
        { id: 'M2', name: 'Операция 2: Заполярный Порт', status: 'LOCKED', pos: { x: 45, y: 25 } },
        { id: 'M3', name: 'Операция 3: Волга-Один', status: 'LOCKED', pos: { x: 65, y: 45 } },
        { id: 'M4', name: 'Операция 4: Берлинский Заслон', status: 'LOCKED', pos: { x: 80, y: 65 } }
    ];
    const current = nodes.find(n => n.id === selectedNode) ?? nodes[0];
    return (_jsxs("div", { style: containerStyle, children: [_jsxs("div", { style: headerStyle, children: [_jsx("button", { style: backBtnStyle, onClick: onBack, children: "\u25C4 \u041D\u0410\u0417\u0410\u0414 \u0412 \u041A\u0410\u041C\u041F\u0410\u041D\u0418\u042E" }), _jsx("h2", { style: { color: '#ff4d4d', margin: 0, fontFamily: 'Orbitron, sans-serif' }, children: "\u0421\u0422\u0420\u0410\u0422\u0415\u0413\u0418\u0427\u0415\u0421\u041A\u0410\u042F \u041A\u0410\u0420\u0422\u0410 \u0422\u0415\u0410\u0422\u0420\u0410 \u0414\u0415\u0419\u0421\u0422\u0412\u0418\u0419" }), _jsx("div", { style: { width: '120px' } })] }), _jsxs("div", { style: bodyStyle, children: [_jsx("div", { style: mapAreaStyle, children: nodes.map(node => (_jsx("div", { onClick: () => setSelectedNode(node.id), style: {
                                position: 'absolute',
                                left: `${node.pos.x}%`,
                                top: `${node.pos.y}%`,
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: node.status === 'ACTIVE' ? '#ff4d4d' : '#444',
                                border: selectedNode === node.id ? '3px solid #00ffc8' : '2px solid #fff',
                                boxShadow: selectedNode === node.id ? '0 0 20px #00ffc8' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }, children: node.id }, node.id))) }), _jsxs("div", { style: infoPanelStyle, children: [_jsx("h3", { style: { color: '#ff4d4d', marginTop: 0, fontFamily: 'Orbitron, sans-serif' }, children: current.name }), _jsxs("div", { style: { fontSize: '13px', color: '#aaa', marginBottom: '20px' }, children: ["\u0421\u0422\u0410\u0422\u0423\u0421: ", _jsx("span", { style: { color: current.status === 'ACTIVE' ? '#00ffc8' : '#888', fontWeight: 'bold' }, children: current.status })] }), _jsx("p", { style: { color: '#ccc', fontSize: '13px', lineHeight: 1.5 }, children: "\u0421\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0443\u0437\u0435\u043B \u0440\u0435\u0433\u0438\u043E\u043D\u0430. \u0412\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043F\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 \u0434\u043B\u044F \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0433\u043E \u0441\u0435\u043A\u0442\u043E\u0440\u0430." }), _jsx("button", { disabled: current.status !== 'ACTIVE', style: {
                                    ...launchBtnStyle,
                                    backgroundColor: current.status === 'ACTIVE' ? '#ff4d4d' : '#444',
                                    cursor: current.status === 'ACTIVE' ? 'pointer' : 'not-allowed'
                                }, onClick: () => onSelectMission(current.id), children: "\u25BA \u041A \u0411\u0420\u0418\u0424\u0418\u041D\u0413\u0423 \u041C\u0418\u0421\u0421\u0418\u0418" })] })] })] }));
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
    zIndex: 3750,
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
    gridTemplateColumns: '1fr 340px',
    gap: '24px'
};
const mapAreaStyle = {
    position: 'relative',
    backgroundColor: 'rgba(12, 18, 28, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 200, 0.05) 0%, transparent 80%)'
};
const infoPanelStyle = {
    backgroundColor: 'rgba(12, 18, 28, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
};
const launchBtnStyle = {
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: 'bold',
    fontFamily: 'Orbitron, sans-serif'
};
//# sourceMappingURL=StrategicMapScreen.js.map