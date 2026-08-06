import { GameSimulation } from '@ra4/sim-core';
import { CommandType, FactionId, OrderMode, PlayerCommand, PlayerType, UnitStance } from '@ra4/shared-types';

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✅ ${name}`);
  else { failures++; console.error(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
}

console.log('Running Stance & Standing Order Tests...');

const twoPlayers = [
  { name: 'P0', factionId: FactionId.USSR, type: PlayerType.HUMAN, team: 0 },
  { name: 'P1', factionId: FactionId.ALLIANCE, type: PlayerType.HUMAN, team: 1 },
];

/** Fresh sim with no AI, so behavior under test is not perturbed. */
function freshSim(seed = 5150): GameSimulation {
  const sim = new GameSimulation(seed);
  sim.initMatch(twoPlayers, 10000);
  return sim;
}

/** Spawn a combat unit for a player at a world position. */
function spawnFighter(sim: GameSimulation, playerIndex: number, x: number, y: number): number {
  const specId = playerIndex === 0 ? 'SU_GranitMBT' : 'AL_BulwarkMBT';
  return sim.spawnUnit(specId, playerIndex, x, y);
}

function run(sim: GameSimulation, ticks: number, commands?: Map<number, PlayerCommand[]>): void {
  for (let t = 0; t < ticks; t++) {
    sim.processCommands(commands?.get(t) ?? []);
    sim.step();
  }
}

const dist = (ax: number, ay: number, bx: number, by: number): number =>
  Math.round(Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2));

/**
 * Effective health = hp + shield. Alliance vehicles carry a 300-point shield,
 * so asserting on hp alone would miss damage that the shield absorbed.
 */
const effHp = (sim: GameSimulation, id: number): number => {
  const e = sim.entities.get(id);
  return e ? e.hp + e.shield : 0;
};

// ── STOP cancels movement ────────────────────────────────────────────────
{
  const sim = freshSim();
  const id = spawnFighter(sim, 0, 30000, 30000);
  sim.processCommands([{ type: CommandType.MOVE, entityIds: [id], targetX: 60000, targetY: 60000, playerIndex: 0, tick: 0 }]);
  run(sim, 20);
  const movedTo = { x: sim.entities.get(id)!.x, y: sim.entities.get(id)!.y };
  const travelled = dist(30000, 30000, movedTo.x, movedTo.y);

  sim.processCommands([{ type: CommandType.STOP, entityIds: [id], playerIndex: 0, tick: 0 }]);
  run(sim, 40);
  const after = sim.entities.get(id)!;
  const driftAfterStop = dist(movedTo.x, movedTo.y, after.x, after.y);

  check(`STOP: unit was moving (travelled ${travelled})`, travelled > 500);
  check(`STOP: unit halts and stays put (drift ${driftAfterStop})`, driftAfterStop < 200, `drift=${driftAfterStop}`);
  check('STOP: order state cleared', after.orderMode === OrderMode.NONE && after.targetX === undefined);
}

// ── HOLD: fires but never pursues ────────────────────────────────────────
{
  // Scout: sight 12000 > weapon range 6000, so an enemy at 9000 is VISIBLE
  // but unreachable without moving — the only setup where "pursue" is
  // distinguishable from "already in range".
  const SCOUT = 'SU_RysScout';
  const setup = () => {
    const sim = freshSim();
    const unit = sim.spawnUnit(SCOUT, 0, 40000, 40000);
    spawnFighter(sim, 1, 49000, 40000); // 9000 away: seen, out of gun range
    return { sim, unit };
  };

  const held = setup();
  held.sim.processCommands([{ type: CommandType.HOLD, entityIds: [held.unit], playerIndex: 0, tick: 0 }]);
  run(held.sim, 120);
  const h = held.sim.entities.get(held.unit)!;
  const moved = dist(40000, 40000, h.x, h.y);
  check(`HOLD: does not pursue a visible out-of-range enemy (moved ${moved})`, moved < 300, `moved=${moved}`);
  check('HOLD: order mode retained', h.orderMode === OrderMode.HOLD);

  // Control: the same unit on default AGGRESSIVE stance DOES close in.
  const free = setup();
  run(free.sim, 120);
  const c = free.sim.entities.get(free.unit)!;
  const chased = dist(40000, 40000, c.x, c.y);
  check(`HOLD control: aggressive unit does pursue (moved ${chased})`, chased > 1000, `moved=${chased}`);

  // And DEFENSIVE stance also refuses to leave its ground.
  const def = setup();
  def.sim.processCommands([{ type: CommandType.SET_STANCE, entityIds: [def.unit], stance: UnitStance.DEFENSIVE, playerIndex: 0, tick: 0 }]);
  run(def.sim, 120);
  const d = def.sim.entities.get(def.unit)!;
  const defMoved = dist(40000, 40000, d.x, d.y);
  check(`DEFENSIVE: holds ground against a visible out-of-range enemy (moved ${defMoved})`, defMoved < 300, `moved=${defMoved}`);
}

// ── HOLD still shoots what comes into range ──────────────────────────────
{
  const sim = freshSim();
  const holder = spawnFighter(sim, 0, 40000, 40000);
  // Enemy inside weapon range: holding must not mean pacifism.
  const victim = spawnFighter(sim, 1, 42000, 40000);
  const victimHp0 = effHp(sim, victim);
  sim.processCommands([{ type: CommandType.HOLD, entityIds: [holder], playerIndex: 0, tick: 0 }]);
  run(sim, 60);
  const after = effHp(sim, victim);
  check('HOLD: still engages enemies within range', after < victimHp0, `effHp ${victimHp0}→${after}`);
}

// ── HOLD_FIRE stance does not shoot ──────────────────────────────────────
{
  const sim = freshSim();
  const pacifist = spawnFighter(sim, 0, 40000, 40000);
  const victim = spawnFighter(sim, 1, 41500, 40000);
  // The enemy must not shoot back, or we cannot attribute damage.
  sim.processCommands([
    { type: CommandType.SET_STANCE, entityIds: [pacifist], stance: UnitStance.HOLD_FIRE, playerIndex: 0, tick: 0 },
    { type: CommandType.SET_STANCE, entityIds: [victim], stance: UnitStance.HOLD_FIRE, playerIndex: 1, tick: 0 },
  ]);
  const hp0 = effHp(sim, victim);
  run(sim, 90);
  check('HOLD_FIRE: does not auto-acquire or fire', effHp(sim, victim) === hp0, `effHp ${hp0}→${effHp(sim, victim)}`);

  // But an explicit ATTACK order overrides hold-fire.
  sim.processCommands([{ type: CommandType.ATTACK, entityIds: [pacifist], targetEntityId: victim, playerIndex: 0, tick: 0 }]);
  run(sim, 60);
  check('HOLD_FIRE: explicit ATTACK order still fires', effHp(sim, victim) < hp0, `effHp=${effHp(sim, victim)}`);
}

// ── PATROL: cycles between waypoints ─────────────────────────────────────
{
  const sim = freshSim();
  const scout = spawnFighter(sim, 0, 20000, 20000);
  sim.processCommands([{ type: CommandType.PATROL, entityIds: [scout], targetX: 32000, targetY: 20000, playerIndex: 0, tick: 0 }]);

  const s0 = sim.entities.get(scout)!;
  check('PATROL: route established with two legs', s0.orderMode === OrderMode.PATROL && (s0.patrolRoute?.length ?? 0) === 2);

  // Sample the x position over a long run; a patrolling unit must both reach
  // the far waypoint and come back toward the origin.
  let maxX = s0.x;
  let minXAfterOutbound = Number.MAX_SAFE_INTEGER;
  let reachedFar = false;
  for (let t = 0; t < 900; t++) {
    sim.step();
    const s = sim.entities.get(scout)!;
    maxX = Math.max(maxX, s.x);
    if (s.x >= 31000) reachedFar = true;
    if (reachedFar) minXAfterOutbound = Math.min(minXAfterOutbound, s.x);
  }
  check(`PATROL: reached the far waypoint (maxX ${maxX})`, reachedFar, `maxX=${maxX}`);
  check(`PATROL: returned toward the origin (minX after ${minXAfterOutbound})`, minXAfterOutbound < 23000, `minX=${minXAfterOutbound}`);
}

// ── PATROL append builds a longer route ──────────────────────────────────
{
  const sim = freshSim();
  const scout = spawnFighter(sim, 0, 20000, 20000);
  sim.processCommands([
    { type: CommandType.PATROL, entityIds: [scout], targetX: 30000, targetY: 20000, playerIndex: 0, tick: 0 },
    { type: CommandType.PATROL, entityIds: [scout], targetX: 30000, targetY: 30000, append: true, playerIndex: 0, tick: 0 },
  ]);
  const s = sim.entities.get(scout)!;
  check('PATROL: append extends the route to 3 legs', (s.patrolRoute?.length ?? 0) === 3, `legs=${s.patrolRoute?.length}`);
}

// ── GUARD: follows the guarded unit ──────────────────────────────────────
{
  const sim = freshSim();
  const vip = spawnFighter(sim, 0, 25000, 25000);
  const escort = spawnFighter(sim, 0, 27000, 25000);
  sim.processCommands([{ type: CommandType.GUARD, entityIds: [escort], targetEntityId: vip, playerIndex: 0, tick: 0 }]);
  // The VIP walks away; the escort must follow rather than stay behind.
  sim.processCommands([{ type: CommandType.MOVE, entityIds: [vip], targetX: 45000, targetY: 25000, playerIndex: 0, tick: 0 }]);
  run(sim, 400);

  const v = sim.entities.get(vip)!;
  const e = sim.entities.get(escort)!;
  const gap = dist(v.x, v.y, e.x, e.y);
  check(`GUARD: escort followed the VIP (gap ${gap})`, gap < 8000, `gap=${gap}`);
  check(`GUARD: escort actually travelled`, dist(27000, 25000, e.x, e.y) > 5000);
  check('GUARD: order mode retained', e.orderMode === OrderMode.GUARD && e.guardEntityId === vip);
}

// ── GUARD: leash — will not be baited across the map ─────────────────────
{
  const sim = freshSim();
  const guard = spawnFighter(sim, 0, 30000, 30000);
  // A distant enemy well beyond the guard leash (6 tiles).
  spawnFighter(sim, 1, 60000, 30000);
  sim.processCommands([{ type: CommandType.GUARD, entityIds: [guard], targetX: 30000, targetY: 30000, playerIndex: 0, tick: 0 }]);
  run(sim, 300);
  const g = sim.entities.get(guard)!;
  const strayed = dist(30000, 30000, g.x, g.y);
  check(`GUARD: stays near its post despite a distant enemy (strayed ${strayed})`, strayed <= 7000, `strayed=${strayed}`);
}

// ── GUARD: dead guarded entity drops the order ────────────────────────────
{
  const sim = freshSim();
  const vip = spawnFighter(sim, 0, 25000, 25000);
  const escort = spawnFighter(sim, 0, 26000, 25000);
  sim.processCommands([{ type: CommandType.GUARD, entityIds: [escort], targetEntityId: vip, playerIndex: 0, tick: 0 }]);
  run(sim, 5);
  sim.removeEntity(vip);
  run(sim, 5);
  const e = sim.entities.get(escort)!;
  check('GUARD: guarding a destroyed entity reverts to idle', e.orderMode === OrderMode.NONE && e.guardEntityId === undefined);
}

// ── A new MOVE order cancels a standing patrol ───────────────────────────
{
  const sim = freshSim();
  const unit = spawnFighter(sim, 0, 20000, 20000);
  sim.processCommands([{ type: CommandType.PATROL, entityIds: [unit], targetX: 30000, targetY: 20000, playerIndex: 0, tick: 0 }]);
  run(sim, 30);
  sim.processCommands([{ type: CommandType.MOVE, entityIds: [unit], targetX: 20000, targetY: 34000, playerIndex: 0, tick: 0 }]);
  run(sim, 400);
  const u = sim.entities.get(unit)!;
  check('MOVE overrides PATROL: order cleared', u.orderMode === OrderMode.NONE && u.patrolRoute === undefined);
  check(`MOVE overrides PATROL: unit went to the new destination (y=${u.y})`, u.y > 30000, `y=${u.y}`);
}

// ── Determinism: same orders + seed ⇒ identical checksum ─────────────────
{
  const buildScenario = (): GameSimulation => {
    const sim = freshSim(777);
    const a = spawnFighter(sim, 0, 20000, 20000);
    const b = spawnFighter(sim, 0, 22000, 20000);
    const c = spawnFighter(sim, 0, 24000, 20000);
    spawnFighter(sim, 1, 40000, 20000);
    const cmds = new Map<number, PlayerCommand[]>([
      [3, [{ type: CommandType.PATROL, entityIds: [a], targetX: 34000, targetY: 20000, playerIndex: 0, tick: 3 }]],
      [5, [{ type: CommandType.HOLD, entityIds: [b], playerIndex: 0, tick: 5 }]],
      [7, [{ type: CommandType.GUARD, entityIds: [c], targetEntityId: b, playerIndex: 0, tick: 7 }]],
      [9, [{ type: CommandType.SET_STANCE, entityIds: [c], stance: UnitStance.DEFENSIVE, playerIndex: 0, tick: 9 }]],
    ]);
    run(sim, 1500, cmds);
    return sim;
  };
  const s1 = buildScenario();
  const s2 = buildScenario();
  check('Determinism: identical checksum across runs with standing orders',
    s1.calculateChecksum() === s2.calculateChecksum(),
    `${s1.calculateChecksum()} vs ${s2.calculateChecksum()}`);

  // The checksum must actually react to order state, otherwise a desync in
  // patrol/guard state would go undetected.
  const s3 = freshSim(777);
  const u = spawnFighter(s3, 0, 20000, 20000);
  const baseline = s3.calculateChecksum();
  s3.processCommands([{ type: CommandType.HOLD, entityIds: [u], playerIndex: 0, tick: 0 }]);
  check('Checksum covers standing-order state', s3.calculateChecksum() !== baseline);
}

if (failures > 0) {
  console.error(`FAILED: ${failures} stance/order test(s) failed.`);
  process.exit(1);
}
console.log('SUCCESS! All Stance & Standing Order Tests passed cleanly.');
