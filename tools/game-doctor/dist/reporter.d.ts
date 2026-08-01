import { GameDoctorReport } from './types.js';
export declare class GameDoctorReporter {
    static writeReports(artifactsDir: string, report: GameDoctorReport): void;
    private static generateMarkdown;
}
