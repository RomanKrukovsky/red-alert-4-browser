import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUIStore } from '../store.js';
export const SkirmishMenu = ({ onStartMatch, onRestartMatch }) => {
    const snapshot = useUIStore((s) => s.snapshot);
    const activePlayerIndex = useUIStore((s) => s.activePlayerIndex);
    if (!snapshot) {
        return (_jsx("div", { style: overlayStyle, children: _jsxs("div", { style: panelStyle, children: [_jsx("h1", { style: { color: '#00ffc8', fontSize: '32px', marginBottom: '10px' }, children: "RED ALERT 4: BROWSER RTS" }), _jsx("p", { style: { color: '#aaa', marginBottom: '30px' }, children: "\u0420\u0435\u0436\u0438\u043C \u00AB\u0421\u0445\u0432\u0430\u0442\u043A\u0430\u00BB \u2014 \u0421\u0421\u0421\u0420 vs \u0410\u043B\u044C\u044F\u043D\u0441 (\u0418\u0418)" }), _jsx("button", { style: btnStyle, onClick: onStartMatch, children: "\u25BA \u041D\u0410\u0427\u0410\u0422\u042C \u041C\u0410\u0422\u0427" })] }) }));
    }
    // Check Match Finish (Victory / Defeat)
    const player = snapshot.players[activePlayerIndex];
    const enemyPlayer = snapshot.players.find((_, idx) => idx !== activePlayerIndex);
    if (player && enemyPlayer) {
        if (!enemyPlayer.hasHQ && snapshot.entities.filter(e => e.playerIndex !== activePlayerIndex && e.isBuilding).length === 0) {
            return (_jsx("div", { style: overlayStyle, children: _jsxs("div", { style: { ...panelStyle, border: '2px solid #00ffc8' }, children: [_jsx("h1", { style: { color: '#00ffc8', fontSize: '36px', marginBottom: '10px' }, children: "\uD83C\uDFC6 \u041F\u041E\u0411\u0415\u0414\u0410!" }), _jsx("p", { style: { color: '#fff', marginBottom: '20px' }, children: "\u0411\u0430\u0437\u0430 \u0418\u0418-\u043F\u0440\u043E\u0442\u0438\u0432\u043D\u0438\u043A\u0430 \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u0443\u043D\u0438\u0447\u0442\u043E\u0436\u0435\u043D\u0430." }), _jsx("button", { style: btnStyle, onClick: onRestartMatch, children: "\u21BB \u0421\u042B\u0413\u0420\u0410\u0422\u042C \u0415\u0429\u0401 \u0420\u0410\u0417" })] }) }));
        }
        else if (!player.hasHQ && snapshot.entities.filter(e => e.playerIndex === activePlayerIndex && e.isBuilding).length === 0) {
            return (_jsx("div", { style: overlayStyle, children: _jsxs("div", { style: { ...panelStyle, border: '2px solid #ff4444' }, children: [_jsx("h1", { style: { color: '#ff4444', fontSize: '36px', marginBottom: '10px' }, children: "\uD83D\uDC80 \u041F\u041E\u0420\u0410\u0416\u0415\u041D\u0418\u0415" }), _jsx("p", { style: { color: '#fff', marginBottom: '20px' }, children: "\u0412\u0430\u0448\u0430 \u0448\u0442\u0430\u0431-\u043A\u0432\u0430\u0440\u0442\u0438\u0440\u0430 \u0438 \u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u043C\u043E\u0449\u043D\u043E\u0441\u0442\u0438 \u0443\u043D\u0438\u0447\u0442\u043E\u0436\u0435\u043D\u044B." }), _jsx("button", { style: btnStyle, onClick: onRestartMatch, children: "\u21BB \u041D\u0410\u0427\u0410\u0422\u042C \u0417\u0410\u041D\u041E\u0412\u041E" })] }) }));
        }
    }
    return null;
};
const overlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(5, 8, 15, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000
};
const panelStyle = {
    backgroundColor: '#0c101a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '40px 60px',
    textAlign: 'center',
    boxShadow: '0 0 30px rgba(0, 255, 200, 0.2)'
};
const btnStyle = {
    backgroundColor: '#00ffc8',
    color: '#05080f',
    border: 'none',
    borderRadius: '4px',
    padding: '14px 28px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.1s ease'
};
//# sourceMappingURL=SkirmishMenu.js.map