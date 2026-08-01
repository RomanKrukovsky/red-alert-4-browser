import { FactionId } from '@ra4/shared-types';
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
export declare class Matchmaker {
    private queue;
    enterQueue(ticket: Omit<MatchmakingTicket, 'ticketId' | 'queuedAt'>): Promise<MatchmakingTicket>;
    leaveQueue(userId: string): Promise<boolean>;
    findMatches(): {
        player1: MatchmakingTicket;
        player2: MatchmakingTicket;
    }[];
    getQueueLength(): number;
}
//# sourceMappingURL=matchmaker.d.ts.map