import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
export const TitleScreen = ({ onEnter }) => {
    useEffect(() => {
        const handleKeyDown = () => onEnter();
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onEnter]);
    return (_jsxs("div", { className: "ra4-title-screen theme-soviet", onClick: onEnter, children: [_jsx("div", { className: "ra4-title-particles" }), _jsxs("div", { className: "ra4-title-content", children: [_jsx("div", { className: "ra4-title-star" }), _jsx("div", { className: "ra4-title-cc", children: "COMMAND & CONQUER\u2122" }), _jsx("h1", { className: "ra4-title-main", children: "RED ALERT 4" })] }), _jsx("div", { className: "ra4-title-prompt", children: "\u041D\u0410\u0416\u041C\u0418\u0422\u0415 \u041B\u042E\u0411\u0423\u042E \u041A\u041B\u0410\u0412\u0418\u0428\u0423" })] }));
};
//# sourceMappingURL=TitleScreen.js.map