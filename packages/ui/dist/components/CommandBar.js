import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Frame } from './Frame.js';
export const CommandBar = () => {
    return (_jsxs(Frame, { className: "ra4-command-bar", style: {
            display: 'flex',
            gap: '10px',
            padding: '10px 20px',
            clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%, 0 20px)',
            borderBottom: 'none'
        }, children: [_jsx("div", { style: { width: '80px', height: '80px', border: '1px solid var(--faction-secondary)', background: '#110000', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: "TNK" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }, children: [1, 2, 3, 4, 5, 6].map(i => (_jsxs("button", { style: {
                        width: '40px',
                        height: '38px',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid var(--faction-dark)',
                        color: 'var(--faction-text-muted)',
                        cursor: 'pointer'
                    }, children: ["A", i] }, i))) })] }));
};
//# sourceMappingURL=CommandBar.js.map