import { GameDoctorOptions } from './types.js';
export declare class GameDoctorRunner {
    private options;
    private serverProcess;
    private detector;
    private rootDir;
    private artifactsDir;
    constructor(options: GameDoctorOptions);
    run(): Promise<boolean>;
    private startDevServer;
    private stopDevServer;
    private checkPort;
}
