import { create } from 'zustand';
import { FactionId } from '@ra4/shared-types';
export const useUIStore = create((set) => ({
    snapshot: null,
    selectedEntityIds: [],
    activePlayerIndex: 0,
    activeFaction: FactionId.USSR,
    activeCategoryTab: 'BUILDINGS',
    evaLogs: [
        { id: '1', timestamp: '00:00', message: 'Командная сеть развёрнута. Ожидание приказов.', type: 'INFO' }
    ],
    isMenuOpen: false,
    setSnapshot: (snapshot) => set({ snapshot }),
    setSelectedEntityIds: (ids) => set({ selectedEntityIds: ids }),
    setActivePlayerIndex: (idx) => set({ activePlayerIndex: idx }),
    setActiveFaction: (faction) => set({ activeFaction: faction }),
    setActiveCategoryTab: (tab) => set({ activeCategoryTab: tab }),
    addEvaLog: (message, type = 'INFO') => set((state) => ({
        evaLogs: [
            ...state.evaLogs.slice(-15),
            { id: Math.random().toString(), timestamp: new Date().toLocaleTimeString(), message, type }
        ]
    })),
    toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen }))
}));
//# sourceMappingURL=store.js.map