"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDbConnected = exports.db = exports.pool = void 0;
exports.initDb = initDb;
exports.closeDb = closeDb;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = __importDefault(require("pg"));
const env_js_1 = require("../config/env.js");
const schema = __importStar(require("./schema.js"));
const { Pool } = pg_1.default;
exports.pool = null;
exports.db = null;
exports.isDbConnected = false;
async function initDb() {
    try {
        exports.pool = new Pool({
            connectionString: env_js_1.env.DATABASE_URL,
            max: 10,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 3000,
        });
        await exports.pool.query('SELECT 1');
        exports.db = (0, node_postgres_1.drizzle)(exports.pool, { schema });
        exports.isDbConnected = true;
        console.log('[DB] PostgreSQL connected successfully.');
        return true;
    }
    catch (error) {
        console.warn('[DB] Could not connect to PostgreSQL. Operating with in-memory fallback store:', error.message);
        exports.isDbConnected = false;
        return false;
    }
}
async function closeDb() {
    if (exports.pool) {
        await exports.pool.end();
        exports.isDbConnected = false;
    }
}
//# sourceMappingURL=db.js.map