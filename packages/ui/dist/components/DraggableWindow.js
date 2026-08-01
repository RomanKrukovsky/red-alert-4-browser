import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useWindowStore } from '../windowStore.js';
import { useUIStore } from '../store.js';
export const DraggableWindow = ({ id, title, initialX = 100, initialY = 100, width, height, children }) => {
    const registerWindow = useWindowStore((s) => s.registerWindow);
    const updatePosition = useWindowStore((s) => s.updatePosition);
    const bringToFront = useWindowStore((s) => s.bringToFront);
    const setMinimized = useWindowStore((s) => s.setMinimized);
    const setClosed = useWindowStore((s) => s.setClosed);
    const windowState = useWindowStore((s) => s.windows[id]);
    const theme = useUIStore((s) => s.theme);
    const headerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    useEffect(() => {
        registerWindow(id, { id, title, x: initialX, y: initialY, width, height, minimized: false, closed: false });
    }, [id, title, initialX, initialY, width, height, registerWindow]);
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging && windowState) {
                updatePosition(id, e.clientX - dragOffset.x, e.clientY - dragOffset.y);
            }
        };
        const handleMouseUp = () => {
            setIsDragging(false);
        };
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, id, windowState, updatePosition]);
    if (!windowState || windowState.closed)
        return null;
    return (_jsxs("div", { className: `ra4-window ${theme}`, onPointerDown: () => bringToFront(id), style: {
            position: 'absolute',
            left: windowState.x,
            top: windowState.y,
            zIndex: windowState.zIndex,
            width: windowState.width,
            height: windowState.height,
            display: windowState.minimized ? 'none' : 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto',
        }, children: [_jsxs("div", { ref: headerRef, className: "ra4-window-header", onPointerDown: (e) => {
                    setIsDragging(true);
                    setDragOffset({
                        x: e.clientX - windowState.x,
                        y: e.clientY - windowState.y
                    });
                    bringToFront(id);
                    e.stopPropagation();
                }, children: [_jsx("span", { className: "ra4-window-title", children: title }), _jsxs("div", { className: "ra4-window-controls", children: [_jsx("button", { className: "ra4-window-btn ra4-window-minimize", onClick: () => setMinimized(id, true), children: "_" }), _jsx("button", { className: "ra4-window-btn ra4-window-close", onClick: () => setClosed(id, true), children: "X" })] })] }), _jsx("div", { className: "ra4-window-content", children: children })] }));
};
//# sourceMappingURL=DraggableWindow.js.map