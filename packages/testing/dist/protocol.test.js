import { BinReader, BinWriter, decodeChecksum, decodeCommandList, decodeEnvelope, decodeJsonPayload, decodeTickFrame, encodeChecksum, encodeCommandList, encodeEnvelope, encodeJsonPayload, encodeTickFrame, ProtocolChannel, PROTOCOL_VERSION, WireError, WireKind, } from '@ra4/netcode';
import { CommandType } from '@ra4/shared-types';
let failures = 0;
function check(name, cond, detail) {
    if (cond)
        console.log(`  ✅ ${name}`);
    else {
        failures++;
        console.error(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    }
}
console.log('Running Protocol v1 Wire Format Tests...');
// ── Envelope round-trip ─────────────────────────────────────────────────
{
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const frame = encodeEnvelope(WireKind.TICK_FRAME, 42, 41, payload);
    const env = decodeEnvelope(frame);
    check('Envelope round-trip: version', env.version === PROTOCOL_VERSION);
    check('Envelope round-trip: kind/seq/ack', env.kind === WireKind.TICK_FRAME && env.seq === 42 && env.ack === 41);
    check('Envelope round-trip: payload', env.payload.length === 5 && env.payload[4] === 5);
}
// ── Envelope rejects garbage ────────────────────────────────────────────
{
    let rejected = 0;
    const cases = [
        new Uint8Array([1, 2, 3]), // truncated
        new Uint8Array(20).fill(0xff), // bad magic
        (() => { const f = encodeEnvelope(WireKind.HEARTBEAT, 1, 0, new Uint8Array(0)); f[2] = 99; return f; })(), // version mismatch
        (() => { const f = encodeEnvelope(WireKind.HEARTBEAT, 1, 0, new Uint8Array(4)); return f.subarray(0, 18); })(), // length mismatch
    ];
    for (const c of cases) {
        try {
            decodeEnvelope(c);
        }
        catch (e) {
            if (e instanceof WireError)
                rejected++;
        }
    }
    check('Envelope rejects malformed frames', rejected === 4, `${rejected}/4`);
}
// ── Command codec round-trip for every command type ─────────────────────
{
    const commands = [
        { type: CommandType.MOVE, entityIds: [1, 2, 3], targetX: 45000, targetY: 32000, playerIndex: 0, tick: 100 },
        { type: CommandType.ATTACK, entityIds: [4], targetEntityId: 99, playerIndex: 1, tick: 101 },
        { type: CommandType.ATTACK_MOVE, entityIds: [5, 6], targetX: 1000, targetY: 2000, playerIndex: 2, tick: 102 },
        { type: CommandType.STOP, entityIds: [7], playerIndex: 3, tick: 103 },
        { type: CommandType.HOLD, entityIds: [8], playerIndex: 0, tick: 104 },
        { type: CommandType.PATROL, entityIds: [9], targetX: 5000, targetY: 6000, playerIndex: 1, tick: 105 },
        { type: CommandType.GUARD, entityIds: [10], targetEntityId: 55, playerIndex: 2, tick: 106 },
        { type: CommandType.BUILD_STRUCTURE, entityIds: [], structureId: 'SU_ThermalPower', gridX: 30, gridY: 44, playerIndex: 0, tick: 107 },
        { type: CommandType.PRODUCE_UNIT, entityIds: [], producerEntityId: 12, unitId: 'SU_GranitMBT', playerIndex: 1, tick: 108 },
        { type: CommandType.CANCEL_PRODUCTION, entityIds: [], producerEntityId: 12, queueIndex: 2, playerIndex: 1, tick: 109 },
        { type: CommandType.SELL_STRUCTURE, entityIds: [], structureEntityId: 13, playerIndex: 2, tick: 110 },
        { type: CommandType.REPAIR_STRUCTURE, entityIds: [], structureEntityId: 14, playerIndex: 3, tick: 111 },
        { type: CommandType.USE_ABILITY, entityIds: [15], abilityId: 'IRON_CURTAIN', targetX: 20000, targetY: 30000, playerIndex: 0, tick: 112 },
        { type: CommandType.CAPTURE_BUILDING, entityIds: [16], targetStructureId: 17, playerIndex: 1, tick: 113 },
        { type: CommandType.DEPOSIT_ORE, entityIds: [18], refineryEntityId: 19, playerIndex: 2, tick: 114 },
        { type: CommandType.GATHER, entityIds: [20], resourceNodeId: 'node_center_rich', playerIndex: 3, tick: 115 },
        { type: CommandType.SURRENDER, entityIds: [], playerIndex: 0, tick: 116 },
    ];
    const encoded = encodeCommandList(commands);
    const decoded = decodeCommandList(encoded);
    check('Command codec: count preserved', decoded.length === commands.length, `${decoded.length}/${commands.length}`);
    // Canonical comparison: key order is irrelevant, values must be identical.
    const canon = (v) => JSON.stringify(v, (_k, val) => val && typeof val === 'object' && !Array.isArray(val)
        ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
        : val);
    let same = true;
    for (let i = 0; i < commands.length; i++) {
        if (canon(decoded[i]) !== canon(commands[i])) {
            same = false;
            console.error(`    mismatch [${i}] (${commands[i].type}):\n      in : ${canon(commands[i])}\n      out: ${canon(decoded[i])}`);
        }
    }
    check('Command codec: every command type round-trips value-exact (17 types)', same);
    // Size sanity: binary must be much smaller than JSON
    const jsonSize = new TextEncoder().encode(JSON.stringify(commands)).byteLength;
    check(`Command codec: binary (${encoded.byteLength} B) < 40% of JSON (${jsonSize} B)`, encoded.byteLength < jsonSize * 0.4);
}
// ── Tick frame + checksum payloads ──────────────────────────────────────
{
    const frame = encodeTickFrame({ tick: 7777, commands: [
            { type: CommandType.MOVE, entityIds: [1], targetX: 5, targetY: 6, playerIndex: 0, tick: 7777 },
        ] });
    const back = decodeTickFrame(frame);
    check('Tick frame round-trip', back.tick === 7777 && back.commands.length === 1 && back.commands[0].type === CommandType.MOVE);
    const cs = decodeChecksum(encodeChecksum({ tick: 123456, checksum: 3735928559 }));
    check('Checksum payload round-trip', cs.tick === 123456 && cs.checksum === 3735928559);
}
// ── JSON payload helper ─────────────────────────────────────────────────
{
    const value = { roomId: 'r1', slots: [{ name: 'Игрок', ready: true }] };
    const back = decodeJsonPayload(encodeJsonPayload(value));
    check('JSON payload round-trip (UTF-8/Cyrillic)', back.slots[0].name === 'Игрок');
}
// ── BinWriter/BinReader bounds ──────────────────────────────────────────
{
    const w = new BinWriter(4); // force growth
    w.u32(0xffffffff);
    w.i32(-123456);
    w.str('привет');
    w.u8(7);
    const r = new BinReader(w.finish());
    check('BinWriter growth + mixed round-trip', r.u32() === 0xffffffff && r.i32() === -123456 && r.str() === 'привет' && r.u8() === 7);
    let threw = false;
    try {
        new BinReader(new Uint8Array(2)).u32();
    }
    catch (e) {
        threw = e instanceof WireError;
    }
    check('BinReader rejects truncated payload', threw);
}
// ── ProtocolChannel: seq/ack/dedup/heartbeat/timeout ────────────────────
{
    let clock = 0;
    const now = () => clock;
    const aOut = [];
    const bOut = [];
    const aReceived = [];
    const bReceived = [];
    const a = new ProtocolChannel({ sendRaw: (f) => aOut.push(f), onMessage: (e) => aReceived.push(e.kind), now });
    const b = new ProtocolChannel({ sendRaw: (f) => bOut.push(f), onMessage: (e) => bReceived.push(e.kind), now });
    a.send(WireKind.SUBMIT_COMMANDS, new Uint8Array([1]));
    a.send(WireKind.SUBMIT_COMMANDS, new Uint8Array([2]));
    for (const f of aOut)
        b.onData(f);
    check('Channel: messages delivered in order', bReceived.length === 2);
    check('Channel: inbound seq tracked', b.getStats().lastInboundSeq === 2);
    // Duplicate replay attack: resend frame 1
    b.onData(aOut[0]);
    check('Channel: duplicate frame dropped', b.getStats().duplicatesDropped === 1 && bReceived.length === 2);
    // Ack piggyback: b replies, a learns its frames were seen
    b.send(WireKind.TICK_FRAME, new Uint8Array([3]));
    for (const f of bOut)
        a.onData(f);
    check('Channel: ack piggybacked', a.getStats().lastPeerAck === 2);
    // Heartbeat on idle
    const sentBefore = a.getStats().sent;
    clock = 2500;
    a.maintain();
    check('Channel: heartbeat sent when idle', a.getStats().sent === sentBefore + 1);
    // Peer timeout detection
    clock = 20000;
    const alive = a.maintain();
    check('Channel: peer timeout detected', alive === false);
    // Heartbeats keep liveness but are not delivered as messages
    const hbFrame = aOut[aOut.length - 1];
    const deliveredBefore = bReceived.length;
    b.onData(hbFrame);
    check('Channel: heartbeat not delivered to handler', bReceived.length === deliveredBefore);
}
if (failures > 0) {
    console.error(`FAILED: ${failures} protocol test(s) failed.`);
    process.exit(1);
}
console.log('SUCCESS! All Protocol v1 Wire Format Tests passed cleanly.');
//# sourceMappingURL=protocol.test.js.map