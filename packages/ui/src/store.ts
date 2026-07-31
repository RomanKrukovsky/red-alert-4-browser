import { create } from 'zustand';
import { WorldSnapshot, FactionId, CommandType } from '@ra4/shared-types';

export interface UIState {
  snapshot: WorldSnapshot | null;
  selectedEntityIds: number[];
  activePlayerIndex: number;
  activeFaction: FactionId;
  activeCategoryTab: 'BUILDINGS' | 'INFANTRY' | 'VEHICLES' | 'AIR' | 'NAVAL';
  evaLogs: { id: string; timestamp: string; message: string; type: 'INFO' | 'WARN' | 'DANGER' }[];
  isMenuOpen: boolean;

  setSnapshot: (snapshot: WorldSnapshot) => void;
  setSelectedEntityIds: (ids: number[]) => void;
  setActivePlayerIndex: (idx: number) => void;
  setActiveFaction: (faction: FactionId) => void;
  setActiveCategoryTab: (tab: 'BUILDINGS' | 'INFANTRY' | 'VEHICLES' | 'AIR' | 'NAVAL') => void;
  addEvaLog: (message: string, type?: 'INFO' | 'WARN' | 'DANGER') => void;
  toggleMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
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
