# RA4 Game Doctor Autonomous QA Report

**Status**: ❌ FAILED  
**Timestamp**: 2026-08-01T19:18:32.945Z  
**Execution Mode**: `play`  
**Duration**: 16.05 seconds  

---

## Executive Summary

- **Total Scenarios Executed**: 1
- **Scenarios Passed**: 0
- **Issues Found**: 1
- **Issues Fixed**: 0

---

## Scenario Results Matrix

| Scenario Name | Status | Duration (ms) | Checksum | Details / Error |
|---|---|---|---|---|
| **Full E2E Playwright Browser Playtest Match** | ❌ FAIL | 16045 | N/A | - |

---

## Performance & Diagnostic Snapshot

| Metric | Value |
|---|---|
| **Sim Tick Avg Time** | 0.08 ms |
| **Sim Tick p95 Time** | 0.15 ms |
| **Sim Tick p99 Time** | 0.25 ms |
| **Active Meshes** | 42 |
| **Draw Calls** | 18 |
| **JS Heap Memory** | 45.20 MB |

---

## Confirmed Game Issues & Fix Status

| ID | Severity | Title | Category | Status | Details |
|---|---|---|---|---|---|
| `exception_1785611912740` | **CRITICAL** | Unhandled Exception | `LIFE_CYCLE` | 🔴 CONFIRMED | [PlaytestBot Error] page.evaluate: ReferenceError: Matrix is not defined
    at RTSRenderer.projectWorldToScreen (http://localhost:5173/src/renderer.ts:568:7)
    at Object.projectWorldToScreen (http: |

---

## Captured Visual Evidence Suite

The following screenshot proof files were captured during the browser scenario:
- `01-main-menu.png`
- `02-skirmish-setup.png`
- `03-match-start.png`

*Report generated automatically by RA4 Game Doctor CLI framework.*
