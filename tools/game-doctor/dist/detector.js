export class GameDoctorDetector {
    consoleErrors = [];
    networkErrors = [];
    unhandledExceptions = [];
    confirmedIssues = new Map();
    logConsoleError(msg) {
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
    logNetworkError(url, status) {
        const errorStr = `HTTP ${status} on ${url}`;
        this.networkErrors.push(errorStr);
    }
    logUnhandledException(err) {
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
    addConfirmedIssue(issue) {
        this.confirmedIssues.set(issue.id, issue);
    }
    markIssueFixed(id) {
        const existing = this.confirmedIssues.get(id);
        if (existing) {
            existing.status = 'FIXED';
        }
    }
    getIssues() {
        return Array.from(this.confirmedIssues.values());
    }
    getConsoleErrors() {
        return [...this.consoleErrors];
    }
    getNetworkErrors() {
        return [...this.networkErrors];
    }
    hasCriticalIssues() {
        return Array.from(this.confirmedIssues.values()).some((i) => i.severity === 'CRITICAL' && i.status === 'CONFIRMED');
    }
}
