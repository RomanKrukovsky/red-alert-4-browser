export interface GameDoctorOptions {
    mode: 'audit' | 'play' | 'headless' | 'visual' | 'stress' | 'soak' | 'report';
    port?: number;
    baseUrl?: string;
    timeoutMs?: number;
    headless?: boolean;
}
export interface GameDoctorIssue {
    id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    category: 'LIFE_CYCLE' | 'ECONOMY' | 'BUILDING' | 'CONTROLS' | 'NAVIGATION' | 'AI' | 'VICTORY_DEFEAT' | 'CONSOLE_ERROR' | 'MEMORY_LEAK' | 'PERFORMANCE';
    status: 'CONFIRMED' | 'FIXED' | 'MONITORING';
    evidence?: string;
}
export interface PerformanceSnapshot {
    fps: number;
    simTickAvgMs: number;
    simTickP95Ms: number;
    simTickP99Ms: number;
    renderFrameTimeMs: number;
    activeMeshes: number;
    totalMeshes: number;
    drawCalls: number;
    reactRenderCount: number;
    jsHeapMb: number;
    materialsCount: number;
    texturesCount: number;
    commandsIssued: number;
    commandsRejected: number;
    stuckUnitsCount: number;
}
export interface GameDoctorReport {
    timestamp: string;
    durationSeconds: number;
    mode: string;
    passed: boolean;
    issuesFoundCount: number;
    issuesFixedCount: number;
    scenarios: {
        name: string;
        passed: boolean;
        durationMs: number;
        error?: string;
        checksum?: number;
    }[];
    screenshots: string[];
    issues: GameDoctorIssue[];
    performance: PerformanceSnapshot;
}
