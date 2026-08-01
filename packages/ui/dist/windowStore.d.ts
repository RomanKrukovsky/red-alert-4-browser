export interface WindowState {
    id: string;
    title: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    zIndex: number;
    minimized: boolean;
    closed: boolean;
}
interface WindowStore {
    windows: Record<string, WindowState>;
    highestZIndex: number;
    registerWindow: (id: string, initialState: Omit<WindowState, 'zIndex'>) => void;
    updatePosition: (id: string, x: number, y: number) => void;
    bringToFront: (id: string) => void;
    setMinimized: (id: string, minimized: boolean) => void;
    setClosed: (id: string, closed: boolean) => void;
    toggleMinimized: (id: string) => void;
}
export declare const useWindowStore: import("zustand").UseBoundStore<import("zustand").StoreApi<WindowStore>>;
export {};
//# sourceMappingURL=windowStore.d.ts.map