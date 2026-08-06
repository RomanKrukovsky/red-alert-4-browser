import { PlayerCommand } from '@ra4/shared-types';
import { BinReader, BinWriter } from './wire.js';
export declare const MAX_COMMANDS_PER_FRAME = 256;
export declare const MAX_ENTITIES_PER_COMMAND = 200;
export declare function encodeCommand(w: BinWriter, cmd: PlayerCommand): void;
export declare function decodeCommand(r: BinReader): PlayerCommand;
export declare function encodeCommandList(commands: PlayerCommand[]): Uint8Array;
export declare function decodeCommandList(payload: Uint8Array): PlayerCommand[];
export interface TickFramePayload {
    tick: number;
    commands: PlayerCommand[];
}
export declare function encodeTickFrame(frame: TickFramePayload): Uint8Array;
export declare function decodeTickFrame(payload: Uint8Array): TickFramePayload;
export interface ChecksumPayload {
    tick: number;
    checksum: number;
}
export declare function encodeChecksum(p: ChecksumPayload): Uint8Array;
export declare function decodeChecksum(payload: Uint8Array): ChecksumPayload;
//# sourceMappingURL=commandCodec.d.ts.map