import { FactionId, PlayerCommand, PlayerType, WorldSnapshot } from '@ra4/shared-types';
import { BinReader, BinWriter, decodeCommand, encodeCommand } from '@ra4/netcode';

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

export const REPLAY_MAGIC = [0x52, 0x41, 0x34, 0x52] as const; // 'RA4R'
export const REPLAY_FORMAT_VERSION = 2;

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
  result: { winnerTeam: number; reason: string } | null;
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

export class ReplayFormatError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ReplayFormatError';
  }
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function encodeReplay(data: ReplayDataV2): Uint8Array {
  const w = new BinWriter(4096);
  for (const b of REPLAY_MAGIC) w.u8(b);
  w.u16(REPLAY_FORMAT_VERSION);

  const headerBytes = textEncoder.encode(JSON.stringify(data.header));
  w.u32(headerBytes.byteLength);
  for (const b of headerBytes) w.u8(b);

  w.u32(data.frames.length);
  for (const frame of data.frames) {
    w.u32(frame.tick);
    w.u16(frame.commands.length);
    for (const cmd of frame.commands) encodeCommand(w, cmd);
  }

  w.u32(data.checkpoints.length);
  for (const cp of data.checkpoints) {
    w.u32(cp.tick);
    w.u32(cp.checksum);
  }

  w.u32(data.keyframes.length);
  for (const kf of data.keyframes) {
    w.u32(kf.tick);
    const json = textEncoder.encode(JSON.stringify(kf.snapshot));
    w.u32(json.byteLength);
    for (const b of json) w.u8(b);
  }

  return w.finish();
}

export function decodeReplay(bytes: Uint8Array): ReplayDataV2 {
  const r = new BinReader(bytes);
  for (const expected of REPLAY_MAGIC) {
    if (r.u8() !== expected) throw new ReplayFormatError('BAD_MAGIC', 'not an RA4R replay file');
  }
  const version = r.u16();
  if (version !== REPLAY_FORMAT_VERSION) {
    throw new ReplayFormatError(
      'VERSION_UNSUPPORTED',
      `replay format v${version} is not supported by this build (supported: v${REPLAY_FORMAT_VERSION}). ` +
      `Открыть реплей можно только совместимой версией игры.`
    );
  }

  const headerLen = r.u32();
  const headerBytes = new Uint8Array(headerLen);
  for (let i = 0; i < headerLen; i++) headerBytes[i] = r.u8();
  const header = JSON.parse(textDecoder.decode(headerBytes)) as ReplayHeaderV2;

  const frameCount = r.u32();
  const frames: ReplayCommandFrame[] = [];
  let prevTick = -1;
  for (let i = 0; i < frameCount; i++) {
    const tick = r.u32();
    if (tick <= prevTick) throw new ReplayFormatError('FRAME_ORDER', `frame ticks not ascending at index ${i}`);
    prevTick = tick;
    const cmdCount = r.u16();
    const commands: PlayerCommand[] = [];
    for (let c = 0; c < cmdCount; c++) commands.push(decodeCommand(r));
    frames.push({ tick, commands });
  }

  const cpCount = r.u32();
  const checkpoints: ReplayCheckpoint[] = [];
  for (let i = 0; i < cpCount; i++) {
    checkpoints.push({ tick: r.u32(), checksum: r.u32() });
  }

  const kfCount = r.u32();
  const keyframes: ReplayKeyframe[] = [];
  for (let i = 0; i < kfCount; i++) {
    const tick = r.u32();
    const len = r.u32();
    const json = new Uint8Array(len);
    for (let b = 0; b < len; b++) json[b] = r.u8();
    keyframes.push({ tick, snapshot: JSON.parse(textDecoder.decode(json)) as WorldSnapshot });
  }

  return { header, frames, checkpoints, keyframes };
}
