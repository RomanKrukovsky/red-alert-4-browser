import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export const TitleScreen = ({ onEnter }) => {
    useEffect(() => {
        const handleKeyDown = () => onEnter();
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onEnter]);
    return (_jsx("div", { style: overlayStyle, onClick: onEnter, children: _jsxs("div", { style: contentStyle, children: [_jsx("div", { style: badgeStyle, children: "RED ALERT 4 \u2014 BROWSER EDITION" }), _jsx("h1", { style: titleStyle, children: "RED ALERT 4" }), _jsx("div", { style: subtitleStyle, children: "\u041A\u0420\u0410\u0421\u041D\u042B\u0419 \u0420\u0423\u0411\u0415\u0416" }), _jsx("div", { style: promptStyle, children: "\u041D\u0410\u0416\u041C\u0418\u0422\u0415 \u041B\u042E\u0411\u0423\u042E \u041A\u041B\u0410\u0412\u0418\u0428\u0423 \u0418\u041B\u0418 \u041A\u041B\u0418\u041A\u041D\u0418\u0422\u0415 \u0414\u041B\u042F \u0412\u0425\u041E\u0414\u0410" })] }) }));
};
const overlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#05080f',
    backgroundImage: 'radial-gradient(circle at 50% 50%, #1a080d 0%, #05080f 80%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 4000,
    fontFamily: 'Inter, system-ui, sans-serif'
};
const contentStyle = {
    textAlign: 'center',
    color: '#fff'
};
const badgeStyle = {
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '3px',
    color: '#ff4d4d',
    marginBottom: '10px'
};
const titleStyle = {
    fontSize: '64px',
    fontWeight: '900',
    letterSpacing: '4px',
    margin: 0,
    color: '#00ffc8',
    textShadow: '0 0 30px rgba(0, 255, 200, 0.5)'
};
const subtitleStyle = {
    fontSize: '22px',
    fontWeight: 'bold',
    letterSpacing: '6px',
    color: '#aaa',
    marginTop: '5px',
    marginBottom: '60px'
};
const promptStyle = {
    fontSize: '16px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    color: '#fff',
    animation: 'pulse 1.5s infinite ease-in-out'
};
//# sourceMappingURL=TitleScreen.js.map