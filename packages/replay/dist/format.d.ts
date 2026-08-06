import { FactionId, PlayerCommand, PlayerType, WorldSnapshot } from '@ra4/shared-types';
/**
 * Replay format v2 ("RA4R").
 *
 * Binary container:
 *   magic   4 bytes  'R''A''4''R'
 *   u16     format version (REPLAY_FORMAT_VERSION)
 *   header  JSON (u32 length + UTF-8)  — sim/content/protocol versions, map,
 *           seed, players, settings, duration, result
 *   u32     command frame count
 *   frames  [u32 tick, u16 count, commands…] — netcode binary codec
 *   u32     checkpoint count
 *   checks  [u32 tick, u32 checksum] — periodic full-state checksums
 *   u32     keyframe count
 *   keys    [u32 tick, u32 jsonLen, WorldSnapshot JSON] — scrub previews
 *
 * Invariants:
 *  - Command frames are strictly ascending by tick.
 *  - Checkpoints let any player verify determinism DURING playback, not
 *    only at the end.
 *  - Keyframes are render-only previews; exact state always comes from
 *    deterministic re-simulation of the command log.
 */
export declare const REPLAY_MAGIC: readonly [82, 65, 52, 82];
export declare const REPLAY_FORMAT_VERSION = 2;
export interface ReplayPlayerInfo {
    name: string;
    factionId: FactionId;
    type: PlayerType;
    team: number;
}
export interface ReplayHeaderV2 {
    formatVersion: number;
    simVersion: string;
    contentHash: string;
    protocolVersion: number;
    mapId: string;
    seed: number;
    tickRate: number;
    players: ReplayPlayerInfo[];
    startingCredits: number;
    durationTicks: number;
    result: {
        winnerTeam: number;
        reason: string;
    } | null;
    recordedAtIso: string;
}
export interface ReplayCommandFrame {
    tick: number;
    commands: PlayerCommand[];
}
export interface ReplayCheckpoint {
    tick: number;
    checksum: number;
}
export interface ReplayKeyframe {
    tick: number;
    snapshot: WorldSnapshot;
}
export interface ReplayDataV2 {
    header: ReplayHeaderV2;
    frames: ReplayCommandFrame[];
    checkpoints: ReplayCheckpoint[];
    keyframes: ReplayKeyframe[];
}
export declare class ReplayFormatError extends Error {
    code: string;
    constructor(code: string, message: string);
}
export declare function encodeReplay(data: ReplayDataV2): Uint8Array;
export declare function decodeReplay(bytes: Uint8Array): ReplayDataV2;
//# sourceMappingURL=format.d.ts.map