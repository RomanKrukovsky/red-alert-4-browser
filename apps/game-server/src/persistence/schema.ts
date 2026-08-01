import { pgTable, uuid, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  nickname: text('nickname').notNull().unique(),
  email: text('email').unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('player'), // 'player' | 'moderator' | 'admin'
  isBanned: boolean('is_banned').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  deviceInfo: text('device_info'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const playerProfiles = pgTable('player_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  matchesPlayed: integer('matches_played').notNull().default(0),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  eloRating: integer('elo_rating').notNull().default(1200),
  totalPlaytimeSeconds: integer('total_playtime_seconds').notNull().default(0),
  favoriteFaction: text('favorite_faction').notNull().default('USSR'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const playerSettings = pgTable('player_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  volumeMaster: integer('volume_master').notNull().default(80),
  volumeSfx: integer('volume_sfx').notNull().default(80),
  volumeMusic: integer('volume_music').notNull().default(80),
  keybindingsJson: jsonb('keybindings_json'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const bans = pgTable('bans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bannedBy: uuid('banned_by').references(() => users.id),
  reason: text('reason').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  ipAddress: text('ip_address'),
  detailsJson: jsonb('details_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  mapId: text('map_id').notNull(),
  seed: integer('seed').notNull(),
  durationTicks: integer('duration_ticks').notNull().default(0),
  winnerTeam: integer('winner_team').notNull().default(-1),
  finishReason: text('finish_reason').notNull().default('SUPERWEAPON_DESTRUCTION'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  finishedAt: timestamp('finished_at'),
});

export const matchPlayers = pgTable('match_players', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  playerIndex: integer('player_index').notNull(),
  factionId: text('faction_id').notNull(),
  team: integer('team').notNull(),
  isWinner: boolean('is_winner').notNull().default(false),
});

export const replays = pgTable('replays', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  contentVersionHash: text('content_version_hash').notNull(),
  simCoreVersion: text('sim_core_version').notNull(),
  replayJson: jsonb('replay_json').notNull(),
  checksumFinal: integer('checksum_final').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
