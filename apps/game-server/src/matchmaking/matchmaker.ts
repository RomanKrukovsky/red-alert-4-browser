import { v4 as uuidv4 } from 'uuid';
import { FactionId } from '@ra4/shared-types';
import { cacheDel, cacheGet, cacheSet } from '../persistence/redis.js';

export interface MatchmakingTicket {
  ticketId: string;
  userId: string;
  nickname: string;
  eloRating: number;
  factionId: FactionId;
  preferredMapId?: string;
  region: string;
  clientVersion: string;
  queuedAt: number;
}

export class Matchmaker {
  private queue: Map<string, MatchmakingTicket> = new Map();

  public async enterQueue(ticket: Omit<MatchmakingTicket, 'ticketId' | 'queuedAt'>): Promise<MatchmakingTicket> {
    // Check if player is already in queue
    const existing = Array.from(this.queue.values()).find(t => t.userId === ticket.userId);
    if (existing) {
      return existing;
    }

    const ticketId = uuidv4().slice(0, 8);
    const fullTicket: MatchmakingTicket = {
      ...ticket,
      ticketId,
      queuedAt: Date.now(),
    };

    this.queue.set(ticketId, fullTicket);
    await cacheSet(`mm:ticket:${ticket.userId}`, ticketId, 300);

    return fullTicket;
  }

  public async leaveQueue(userId: string): Promise<boolean> {
    const ticketId = await cacheGet(`mm:ticket:${userId}`);
    if (ticketId && this.queue.has(ticketId)) {
      this.queue.delete(ticketId);
      await cacheDel(`mm:ticket:${userId}`);
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

  public findMatches(): { player1: MatchmakingTicket; player2: MatchmakingTicket }[] {
    const matchesFound: { player1: MatchmakingTicket; player2: MatchmakingTicket }[] = [];
    const tickets = Array.from(this.queue.values());

    for (let i = 0; i < tickets.length; i++) {
      const p1 = tickets[i];
      if (!this.queue.has(p1.ticketId)) continue;

      for (let j = i + 1; j < tickets.length; j++) {
        const p2 = tickets[j];
        if (!this.queue.has(p2.ticketId)) continue;

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

  public getQueueLength(): number {
    return this.queue.size;
  }
}
