# UI Architecture & Event-Driven ViewModels

## Overview
The UI layer (`packages/ui`) is built with React 18 and Zustand.

## Zero Scene Polling
The UI does **not** query 3D Babylon.js scene objects per frame. Instead, the simulation emits a `WorldSnapshot` every tick (30 Hz), which updates the Zustand store (`useUIStore`).

## Core Components
- `HUDHeader`: Top bar displaying Credits, Power Grid (MW), Command Cap, and Faction Special Resource.
- `Minimap`: Real-time 2D Canvas rendering of terrain, fog of war, and unit icons.
- `ProductionPanel`: Categorized tabs for Buildings, Infantry, Vehicles, Air, Naval.
- `CommandBar`: Instant action buttons (Move, Attack, Stop, Hold, Repair, Sell).
- `EVALog`: Tactical voice and event log notifications queue.
