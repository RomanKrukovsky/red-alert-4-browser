# Build & Quick Start Guide

## Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0

## Quick Start (Single Command)
```bash
# 1. Install Workspace Dependencies
pnpm install

# 2. Validate Game Content
pnpm content:validate

# 3. Run Determinism Verification Test (10,000 Ticks)
pnpm test:determinism

# 4. Launch Development Mode (Server + Web Client)
pnpm dev
```

The web application will open at `http://localhost:5173`.
The authoritative WebSocket server runs on `ws://localhost:8080`.
The Map Editor tools app runs on `http://localhost:5174`.
