import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUIStore } from '../store.js';
export const Frame = ({ children, variant = 'panel', withGlow = false, className = '', ...props }) => {
    const { theme } = useUIStore();
    const baseClasses = `ra4-frame ra4-frame-${variant} ${withGlow ? 'ra4-frame-glow' : ''} ${className}`;
    return (_jsxs("div", { className: baseClasses, ...props, children: [_jsx("div", { className: "ra4-frame-border-top" }), _jsx("div", { className: "ra4-frame-border-right" }), _jsx("div", { className: "ra4-frame-border-bottom" }), _jsx("div", { className: "ra4-frame-border-left" }), _jsx("div", { className: "ra4-frame-content", children: children })] }));
};
//# sourceMappingURL=Frame.js.map