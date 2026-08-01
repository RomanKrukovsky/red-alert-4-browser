import { GameDoctorIssue } from './types.js';

export class GameDoctorDetector {
  private consoleErrors: string[] = [];
  private networkErrors: string[] = [];
  private unhandledExceptions: string[] = [];
  private confirmedIssues: Map<string, GameDoctorIssue> = new Map();

  public logConsoleError(msg: string): void {
    this.consoleErrors.push(msg);
    if (!this.confirmedIssues.has('console_errors')) {
      this.confirmedIssues.set('console_errors', {
        id: 'console_errors',
        severity: 'HIGH',
        title: 'Console Errors Detected',
        description: `Browser emitted console error: ${msg.slice(0, 120)}`,
        category: 'CONSOLE_ERROR',
        status: 'CONFIRMED',
        evidence: msg,
      });
    }
  }

  public logNetworkError(url: string, status: number): void {
    const errorStr = `HTTP ${status} on ${url}`;
    this.networkErrors.push(errorStr);
  }

  public logUnhandledException(err: string): void {
    this.unhandledExceptions.push(err);
    this.confirmedIssues.set(`exception_${Date.now()}`, {
      id: `exception_${Date.now()}`,
      severity: 'CRITICAL',
      title: 'Unhandled Exception',
      description: err.slice(0, 200),
      category: 'LIFE_CYCLE',
      status: 'CONFIRMED',
      evidence: err,
    });
  }

  public addConfirmedIssue(issue: GameDoctorIssue): void {
    this.confirmedIssues.set(issue.id, issue);
  }

  public markIssueFixed(id: string): void {
    const existing = this.confirmedIssues.get(id);
    if (existing) {
      existing.status = 'FIXED';
    }
  }

  public getIssues(): GameDoctorIssue[] {
    return Array.from(this.confirmedIssues.values());
  }

  public getConsoleErrors(): string[] {
    return [...this.consoleErrors];
  }

  public getNetworkErrors(): string[] {
    return [...this.networkErrors];
  }

  public hasCriticalIssues(): boolean {
    return Array.from(this.confirmedIssues.values()).some((i) => i.severity === 'CRITICAL' && i.status === 'CONFIRMED');
  }
}
