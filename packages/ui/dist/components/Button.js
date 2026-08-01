import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUIStore } from '../store';
import '../tokens/colors.css';
import '../tokens/spacing.css';
import '../tokens/typography.css';
import '../tokens/effects.css';
export const Button = ({ children, variant = 'primary', size = 'md', active = false, className = '', ...props }) => {
    const { theme } = useUIStore();
    // Base classes that apply layout, typography and effects via tokens
    const baseClasses = `ra4-button ra4-button-${variant} ra4-button-${size} ${active ? 'active' : ''} ${className}`;
    return (_jsxs("button", { className: baseClasses, ...props, children: [_jsx("span", { className: "ra4-button-inner", children: children }), variant === 'primary' && _jsx("div", { className: "ra4-button-glow" })] }));
};
//# sourceMappingURL=Button.js.map