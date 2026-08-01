import { create } from 'zustand';
export const useWindowStore = create((set, get) => ({
    windows: {},
    highestZIndex: 100,
    registerWindow: (id, initialState) => set((state) => {
        if (state.windows[id])
            return state; // Already registered
        const nextZ = state.highestZIndex + 1;
        return {
            windows: { ...state.windows, [id]: { ...initialState, zIndex: nextZ } },
            highestZIndex: nextZ
        };
    }),
    updatePosition: (id, x, y) => set((state) => {
        const w = state.windows[id];
        if (!w)
            return state;
        return {
            windows: { ...state.windows, [id]: { ...w, x, y } }
        };
    }),
    bringToFront: (id) => set((state) => {
        const w = state.windows[id];
        if (!w)
            return state;
        if (w.zIndex === state.highestZIndex)
            return state;
        const nextZ = state.highestZIndex + 1;
        return {
            windows: { ...state.windows, [id]: { ...w, zIndex: nextZ } },
            highestZIndex: nextZ
        };
    }),
    setMinimized: (id, minimized) => set((state) => {
        const w = state.windows[id];
        if (!w)
            return state;
        return {
            windows: { ...state.windows, [id]: { ...w, minimized } }
        };
    }),
    setClosed: (id, closed) => set((state) => {
        const w = state.windows[id];
        if (!w)
            return state;
        return {
            windows: { ...state.windows, [id]: { ...w, closed } }
        };
    }),
    toggleMinimized: (id) => set((state) => {
        const w = state.windows[id];
        if (!w)
            return state;
        return {
            windows: { ...state.windows, [id]: { ...w, minimized: !w.minimized } }
        };
    }),
}));
//# sourceMappingURL=windowStore.js.map