import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const LoadingScreen = ({ progress, mapName = 'Красный Рубеж (64x64)' }) => {
    return (_jsx("div", { style: containerStyle, children: _jsxs("div", { style: contentStyle, children: [_jsx("div", { style: badgeStyle, children: "\u0417\u0410\u041A\u041B\u042E\u0427\u0418\u0422\u0415\u041B\u042C\u041D\u0410\u042F \u041F\u041E\u0414\u0413\u041E\u0422\u041E\u0412\u041A\u0410 \u0421\u0415\u0420\u0412\u0415\u0420\u0410" }), _jsx("h1", { style: titleStyle, children: mapName }), _jsx("p", { style: { color: '#aaa', marginBottom: '40px' }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 3D-\u043C\u043E\u0434\u0435\u043B\u0435\u0439, \u0448\u0435\u0439\u0434\u0435\u0440\u043E\u0432, PBR-\u043B\u0430\u043D\u0434\u0448\u0430\u0444\u0442\u0430 \u0438 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F sim-core..." }), _jsx("div", { style: progressTrackStyle, children: _jsx("div", { style: { width: `${progress}%`, height: '100%', backgroundColor: '#00ffc8', transition: 'width 0.1s ease' } }) }), _jsxs("div", { style: { fontSize: '18px', fontWeight: 'bold', color: '#00ffc8', marginTop: '12px' }, children: [progress, "%"] }), _jsxs("div", { style: hintBoxStyle, children: [_jsx("span", { style: { color: '#ff4d4d', fontWeight: 'bold' }, children: "\u0422\u0410\u041A\u0422\u0418\u0427\u0415\u0421\u041A\u0418\u0419 \u0421\u041E\u0412\u0415\u0422:" }), " \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0433\u043E\u0440\u044F\u0447\u0438\u0435 \u0433\u0440\u0443\u043F\u043F\u044B Ctrl+1..9 \u0434\u043B\u044F \u043C\u0433\u043D\u043E\u0432\u0435\u043D\u043D\u043E\u0433\u043E \u043E\u0431\u044A\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F \u0442\u0430\u043D\u043A\u043E\u0432 \u0438 \u043A\u043E\u043C\u0431\u0430\u0439\u043D\u043E\u0432 \u0432 \u0448\u0442\u0443\u0440\u043C\u043E\u0432\u044B\u0435 \u043A\u0443\u043B\u0430\u043A\u0438."] })] }) }));
};
const containerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#05080f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3900,
    fontFamily: 'Inter, system-ui, sans-serif'
};
const contentStyle = {
    textAlign: 'center',
    maxWidth: '600px',
    color: '#fff'
};
const badgeStyle = {
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    color: '#00ffc8',
    marginBottom: '10px'
};
const titleStyle = {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    fontFamily: 'Orbitron, sans-serif'
};
const progressTrackStyle = {
    width: '100%',
    height: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '5px',
    overflow: 'hidden'
};
const hintBoxStyle = {
    marginTop: '40px',
    padding: '16px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#ccc',
    lineHeight: 1.5
};
//# sourceMappingURL=LoadingScreen.js.map