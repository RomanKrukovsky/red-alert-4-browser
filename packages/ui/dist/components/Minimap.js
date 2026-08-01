import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Frame } from './Frame.js';
export const Minimap = () => {
    return (_jsxs(Frame, { className: "ra4-minimap-panel", style: {
            width: '300px',
            height: '300px',
            display: 'flex',
            flexDirection: 'column',
            padding: '10px',
            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)'
        }, children: [_jsxs("div", { style: {
                    flex: 1,
                    background: '#000',
                    border: '1px solid var(--faction-secondary)',
                    position: 'relative',
                    overflow: 'hidden'
                }, children: [_jsx("div", { style: {
                            width: '100%',
                            height: '100%',
                            backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"10\\" height=\\"10\\"><rect width=\\"10\\" height=\\"10\\" fill=\\"%23110000\\"/><circle cx=\\"5\\" cy=\\"5\\" r=\\"1\\" fill=\\"%23330000\\"/></svg>")',
                            backgroundSize: '20px 20px'
                        } }), _jsx("div", { style: { position: 'absolute', top: '40%', left: '40%', width: '4px', height: '4px', background: '#00ff00' } }), _jsx("div", { style: { position: 'absolute', top: '45%', left: '38%', width: '4px', height: '4px', background: '#00ff00' } }), _jsx("div", { style: { position: 'absolute', top: '70%', left: '80%', width: '4px', height: '4px', background: '#ff0000' } }), _jsx("div", { style: {
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: '150%',
                            height: '150%',
                            background: 'conic-gradient(from 0deg, transparent 70%, rgba(255, 0, 0, 0.4) 100%)',
                            transformOrigin: '0 0',
                            animation: 'spin 4s linear infinite'
                        } })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginTop: '10px' }, children: [_jsx("button", { style: { background: 'transparent', border: '1px solid var(--faction-dark)', color: 'var(--faction-text)', padding: '5px 10px', fontSize: '10px' }, children: "\u0420\u0415\u0416\u0418\u041C 1" }), _jsx("button", { style: { background: 'transparent', border: '1px solid var(--faction-dark)', color: 'var(--faction-text)', padding: '5px 10px', fontSize: '10px' }, children: "\u0420\u0415\u0416\u0418\u041C 2" })] }), _jsx("style", { children: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      ` })] }));
};
//# sourceMappingURL=Minimap.js.map