import { GameDoctorDetector } from './detector.js';
export interface PlaytestBotOptions {
    baseUrl: string;
    artifactsDir: string;
    detector: GameDoctorDetector;
    headless?: boolean;
}
export declare class PlaytestBot {
    private baseUrl;
    private artifactsDir;
    private detector;
    private headless;
    constructor(options: PlaytestBotOptions);
    runFullPlaytest(): Promise<boolean>;
}
