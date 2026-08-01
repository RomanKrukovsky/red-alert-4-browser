"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replays = exports.matchPlayers = exports.matches = exports.auditLogs = exports.bans = exports.playerSettings = exports.playerProfiles = exports.sessions = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    nickname: (0, pg_core_1.text)('nickname').notNull().unique(),
    email: (0, pg_core_1.text)('email').unique(),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
    role: (0, pg_core_1.text)('role').notNull().default('player'), // 'player' | 'moderator' | 'admin'
    isBanned: (0, pg_core_1.boolean)('is_banned').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    refreshTokenHash: (0, pg_core_1.text)('refresh_token_hash').notNull(),
    deviceInfo: (0, pg_core_1.text)('device_info'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.playerProfiles = (0, pg_core_1.pgTable)('player_profiles', {
    userId: (0, pg_core_1.uuid)('user_id').primaryKey().references(() => exports.users.id, { onDelete: 'cascade' }),
    matchesPlayed: (0, pg_core_1.integer)('matches_played').notNull().default(0),
    wins: (0, pg_core_1.integer)('wins').notNull().default(0),
    losses: (0, pg_core_1.integer)('losses').notNull().default(0),
    eloRating: (0, pg_core_1.integer)('elo_rating').notNull().default(1200),
    totalPlaytimeSeconds: (0, pg_core_1.integer)('total_playtime_seconds').notNull().default(0),
    favoriteFaction: (0, pg_core_1.text)('favorite_faction').notNull().default('USSR'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.playerSettings = (0, pg_core_1.pgTable)('player_settings', {
    userId: (0, pg_core_1.uuid)('user_id').primaryKey().references(() => exports.users.id, { onDelete: 'cascade' }),
    volumeMaster: (0, pg_core_1.integer)('volume_master').notNull().default(80),
    volumeSfx: (0, pg_core_1.integer)('volume_sfx').notNull().default(80),
    volumeMusic: (0, pg_core_1.integer)('volume_music').notNull().default(80),
    keybindingsJson: (0, pg_core_1.jsonb)('keybindings_json'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.bans = (0, pg_core_1.pgTable)('bans', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    bannedBy: (0, pg_core_1.uuid)('banned_by').references(() => exports.users.id),
    reason: (0, pg_core_1.text)('reason').notNull(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.auditLogs = (0, pg_core_1.pgTable)('audit_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id),
    action: (0, pg_core_1.text)('action').notNull(),
    ipAddress: (0, pg_core_1.text)('ip_address'),
    detailsJson: (0, pg_core_1.jsonb)('details_json'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.matches = (0, pg_core_1.pgTable)('matches', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    mapId: (0, pg_core_1.text)('map_id').notNull(),
    seed: (0, pg_core_1.integer)('seed').notNull(),
    durationTicks: (0, pg_core_1.integer)('duration_ticks').notNull().default(0),
    winnerTeam: (0, pg_core_1.integer)('winner_team').notNull().default(-1),
    finishReason: (0, pg_core_1.text)('finish_reason').notNull().default('SUPERWEAPON_DESTRUCTION'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    finishedAt: (0, pg_core_1.timestamp)('finished_at'),
});
exports.matchPlayers = (0, pg_core_1.pgTable)('match_players', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    matchId: (0, pg_core_1.uuid)('match_id').notNull().references(() => exports.matches.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id),
    playerIndex: (0, pg_core_1.integer)('player_index').notNull(),
    factionId: (0, pg_core_1.text)('faction_id').notNull(),
    team: (0, pg_core_1.integer)('team').notNull(),
    isWinner: (0, pg_core_1.boolean)('is_winner').notNull().default(false),
});
exports.replays = (0, pg_core_1.pgTable)('replays', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    matchId: (0, pg_core_1.uuid)('match_id').notNull().references(() => exports.matches.id, { onDelete: 'cascade' }),
    contentVersionHash: (0, pg_core_1.text)('content_version_hash').notNull(),
    simCoreVersion: (0, pg_core_1.text)('sim_core_version').notNull(),
    replayJson: (0, pg_core_1.jsonb)('replay_json').notNull(),
    checksumFinal: (0, pg_core_1.integer)('checksum_final').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
//# sourceMappingURL=schema.js.map