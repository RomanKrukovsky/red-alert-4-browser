import { GameDoctorIssue } from './types.js';
export declare class GameDoctorDetector {
    private consoleErrors;
    private networkErrors;
    private unhandledExceptions;
    private confirmedIssues;
    logConsoleError(msg: string): void;
    logNetworkError(url: string, status: number): void;
    logUnhandledException(err: string): void;
    addConfirmedIssue(issue: GameDoctorIssue): void;
    markIssueFixed(id: string): void;
    getIssues(): GameDoctorIssue[];
    getConsoleErrors(): string[];
    getNetworkErrors(): string[];
    hasCriticalIssues(): boolean;
}
