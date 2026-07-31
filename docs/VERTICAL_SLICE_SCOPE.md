# RA4 Browser RTS — Vertical Slice Scope Definition

**Document Version**: 1.0  
**Target Milestone**: Single-Player Skirmish Vertical Slice (Playable End-to-End)

---

## 1. Primary Objective

Deliver a fully playable, polished, single-player **Skirmish Match** where a player launches a map, controls an army, mines resources, builds a base, produces combat units, battles an AI opponent, and achieves Victory or Defeat.

---

## 2. In-Scope Features (Vertical Slice Boundary)

| Area | Included Scope |
| :--- | :--- |
| **Map & Terrain** | 1 official map (`Красный Рубеж`, 64x64 grid), terrain height, passability grid, spawn points, resource nodes. |
| **Camera & Control** | RTS Camera (WASD keys, edge pan, scroll zoom, boundary constraints), Input Manager (click select, drag box, right-click Move/Attack/Gather, Ctrl+1..9 hotkey groups). |
| **Faction** | 1 Player Faction (СССР) vs 1 AI Faction (Альянс). |
| **Buildings** | Red HQ (Красный штаб), Thermal Power Plant (Тепловая электростанция), Ore Refinery (Рудный комбинат), Heavy Factory (Тяжёлый завод), Pillbox Turret (Пулемётный дот). |
| **Units** | Harvester (ГРМ-8 «Богатырь»), Rifleman (МС-12 «Рубеж»), Main Battle Tank (ОБТ-92 «Гранит»). |
| **Economy** | Ore harvesting loop (mine at node -> transport to refinery -> credit deposit), Power Grid (MW produced vs consumed, low power slowdown). |
| **Combat & Navigation** | Grid A* pathfinding, group formation offsets, attack range, cooldowns, damage matrix, shield/HP reduction, unit death & cleanup. |
| **AI Opponent** | Fair Skirmish AI (operates through Fog of War, builds base, recruits army, launches attack waves). |
| **User Interface** | Main Menu, Skirmish Setup Screen, HUD (Credits, Power Grid, Command Cap, Minimap Canvas, Production Queue, Command Bar, EVA Log), Pause Overlay, Victory / Defeat Screens. |

---

## 3. Explicitly Forbidden Features (Deferred Until Post-Vertical Slice)

> [!WARNING]
> To ensure maximum quality, stability, and completion of the core RTS loop, the following features are **STRICTLY PROHIBITED** from development during Stages 1-10:

1. **Single-Player Campaign & Story Missions**
2. **Multiplayer Backend & Matchmaking Lobbies**
3. **Map Editor Application & Modding Tools**
4. **Accounts, Profiles, Ranks, and Shop/Cosmetics**
5. **Full 20+ Unit Roster expansion per faction**
6. **Achievements and Quests**
7. **Procedural Terrain Generators**
