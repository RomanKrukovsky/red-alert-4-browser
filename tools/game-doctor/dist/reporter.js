import * as fs from 'fs';
import * as path from 'path';
export class GameDoctorReporter {
    static writeReports(artifactsDir, report) {
        if (!fs.existsSync(artifactsDir)) {
            fs.mkdirSync(artifactsDir, { recursive: true });
        }
        const jsonPath = path.join(artifactsDir, 'report.json');
        fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
        const mdPath = path.join(artifactsDir, 'report.md');
        const mdContent = this.generateMarkdown(report);
        fs.writeFileSync(mdPath, mdContent, 'utf-8');
    }
    static generateMarkdown(report) {
        const statusEmoji = report.passed ? '✅ PASSED' : '❌ FAILED';
        let md = `# RA4 Game Doctor Autonomous QA Report

**Status**: ${statusEmoji}  
**Timestamp**: ${report.timestamp}  
**Execution Mode**: \`${report.mode}\`  
**Duration**: ${report.durationSeconds.toFixed(2)} seconds  

---

## Executive Summary

- **Total Scenarios Executed**: ${report.scenarios.length}
- **Scenarios Passed**: ${report.scenarios.filter((s) => s.passed).length}
- **Issues Found**: ${report.issuesFoundCount}
- **Issues Fixed**: ${report.issuesFixedCount}

---

## Scenario Results Matrix

| Scenario Name | Status | Duration (ms) | Checksum | Details / Error |
|---|---|---|---|---|
`;
        for (const scenario of report.scenarios) {
            const icon = scenario.passed ? '✅ PASS' : '❌ FAIL';
            const checksumStr = scenario.checksum ? `\`${scenario.checksum}\`` : 'N/A';
            const errStr = scenario.error ? scenario.error.replace(/\n/g, ' ') : '-';
            md += `| **${scenario.name}** | ${icon} | ${scenario.durationMs} | ${checksumStr} | ${errStr} |\n`;
        }
        md += `
---

## Performance & Diagnostic Snapshot

| Metric | Value |
|---|---|
| **Sim Tick Avg Time** | ${report.performance.simTickAvgMs} ms |
| **Sim Tick p95 Time** | ${report.performance.simTickP95Ms} ms |
| **Sim Tick p99 Time** | ${report.performance.simTickP99Ms} ms |
| **Active Meshes** | ${report.performance.activeMeshes} |
| **Draw Calls** | ${report.performance.drawCalls} |
| **JS Heap Memory** | ${report.performance.jsHeapMb.toFixed(2)} MB |

---

## Confirmed Game Issues & Fix Status

`;
        if (report.issues.length === 0) {
            md += `*No critical game issues detected during test execution.*\n`;
        }
        else {
            md += `| ID | Severity | Title | Category | Status | Details |\n|---|---|---|---|---|---|\n`;
            for (const issue of report.issues) {
                const statusBadge = issue.status === 'FIXED' ? '🟢 FIXED' : '🔴 CONFIRMED';
                md += `| \`${issue.id}\` | **${issue.severity}** | ${issue.title} | \`${issue.category}\` | ${statusBadge} | ${issue.description} |\n`;
            }
        }
        md += `
---

## Captured Visual Evidence Suite

The following screenshot proof files were captured during the browser scenario:
`;
        for (const img of report.screenshots) {
            md += `- \`${img}\`\n`;
        }
        md += `\n*Report generated automatically by RA4 Game Doctor CLI framework.*\n`;
        return md;
    }
}
