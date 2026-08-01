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
    theme: 'theme-soviet',
    inputMode: 'RTS',
    consoleOpen: false,
    adminUser: { nickname: 'Админ', role: 'admin', token: 'server_auth_admin_token_83921' },
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
    toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
    setTheme: (theme) => set({ theme }),
    setInputMode: (inputMode) => set({ inputMode }),
    setConsoleOpen: (consoleOpen) => set({ consoleOpen }),
    setAdminUser: (adminUser) => set({ adminUser })
}));
//# sourceMappingURL=store.js.map