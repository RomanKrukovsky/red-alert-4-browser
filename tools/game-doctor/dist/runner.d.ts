import { GameDoctorOptions } from './types.js';
export declare class GameDoctorRunner {
    private options;
    private serverProcess;
    private detector;
    private rootDir;
    private artifactsDir;
    constructor(options: GameDoctorOptions);
    run(): Promise<boolean>;
    startDevServer(port?: number): Promise<void>;
    stopDevServer(): void;
    private checkPort;
}
