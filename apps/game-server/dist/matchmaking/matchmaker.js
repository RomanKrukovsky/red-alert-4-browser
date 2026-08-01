"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Matchmaker = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const redis_js_1 = require("../persistence/redis.js");
class Matchmaker {
    queue = new Map();
    async enterQueue(ticket) {
        // Check if player is already in queue
        const existing = Array.from(this.queue.values()).find(t => t.userId === ticket.userId);
        if (existing) {
            return existing;
        }
        const ticketId = node_crypto_1.default.randomUUID().slice(0, 8);
        const fullTicket = {
            ...ticket,
            ticketId,
            queuedAt: Date.now(),
        };
        this.queue.set(ticketId, fullTicket);
        await (0, redis_js_1.cacheSet)(`mm:ticket:${ticket.userId}`, ticketId, 300);
        return fullTicket;
    }
    async leaveQueue(userId) {
        const ticketId = await (0, redis_js_1.cacheGet)(`mm:ticket:${userId}`);
        if (ticketId && this.queue.has(ticketId)) {
            this.queue.delete(ticketId);
            await (0, redis_js_1.cacheDel)(`mm:ticket:${userId}`);
            return true;
        }
        for (const [id, t] of this.queue.entries()) {
            if (t.userId === userId) {
                this.queue.delete(id);
                return true;
            }
        }
        return false;
    }
    findMatches() {
        const matchesFound = [];
        const tickets = Array.from(this.queue.values());
        for (let i = 0; i < tickets.length; i++) {
            const p1 = tickets[i];
            if (!this.queue.has(p1.ticketId))
                continue;
            for (let j = i + 1; j < tickets.length; j++) {
                const p2 = tickets[j];
                if (!this.queue.has(p2.ticketId))
                    continue;
                // Calculate expanding rating tolerance based on time in queue
                const timeInQueueSec = (Date.now() - Math.min(p1.queuedAt, p2.queuedAt)) / 1000;
                const maxEloDiff = 100 + timeInQueueSec * 10; // Expands by 10 Elo points per second
                if (Math.abs(p1.eloRating - p2.eloRating) <= maxEloDiff) {
                    // Found match!
                    this.queue.delete(p1.ticketId);
                    this.queue.delete(p2.ticketId);
                    matchesFound.push({ player1: p1, player2: p2 });
                    break;
                }
            }
        }
        return matchesFound;
    }
    getQueueLength() {
        return this.queue.size;
    }
}
exports.Matchmaker = Matchmaker;
//# sourceMappingURL=matchmaker.js.map