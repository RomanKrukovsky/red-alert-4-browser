import React, { useEffect, useRef } from 'react';
import { useUIStore } from '../store.js';
export const Minimap = () => {
    const canvasRef = useRef(null);
    const snapshot = useUIStore((s) => s.snapshot);
    const playerIdx = useUIStore((s) => s.activePlayerIndex);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // Clear background
        ctx.fillStyle = '#080d14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw grid border
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        if (!snapshot)
            return;
        // Draw entities
        const mapScale = canvas.width / (64 * 1000);
        for (const e of snapshot.entities) {
            const mx = e.position.x * mapScale;
            const my = e.position.y * mapScale;
            if (e.playerIndex === playerIdx) {
                ctx.fillStyle = '#00ff66';
            }
            else {
                ctx.fillStyle = '#ff3333';
            }
            const size = e.isBuilding ? 6 : 3;
            ctx.fillRect(mx - size / 2, my - size / 2, size, size);
        }
    }, [snapshot, playerIdx]);
    return (<div style={{
            width: '180px',
            height: '180px',
            background: '#0c121c',
            border: '2px solid rgba(0, 255, 200, 0.3)',
            boxShadow: '0 0 15px rgba(0,0,0,0.8)',
            position: 'relative'
        }}>
      <canvas ref={canvasRef} width={180} height={180}/>
      <div style={{
            position: 'absolute',
            bottom: '4px',
            left: '4px',
            fontSize: '9px',
            color: '#00ffc8',
            fontWeight: 700,
            textTransform: 'uppercase'
        }}>
        РАДАР: АКТИВЕН
      </div>
    </div>);
};
//# sourceMappingURL=Minimap.js.map