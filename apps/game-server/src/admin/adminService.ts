import { UserRole } from '../auth/service.js';
import { AuthoritativeMatchRuntime } from '../matches/matchRuntime.js';
import { RoomManager } from '../lobby/roomManager.js';
import { db, isDbConnected } from '../persistence/db.js';
import { auditLogs } from '../persistence/schema.js';

export interface AdminCommandRequest {
  command: string;
  args: string[];
  userId: string;
  role: UserRole;
  ipAddress?: string;
  match?: AuthoritativeMatchRuntime;
  isSandboxOrDevMatch?: boolean;
}

export interface AdminCommandResult {
  success: boolean;
  message: string;
  output?: any;
}

export class AdminService {
  /**
   * Execute an administrative command with server-side role validation and audit logging.
   */
  public static async executeCommand(req: AdminCommandRequest, roomManager?: RoomManager): Promise<AdminCommandResult> {
    const cmd = req.command.toLowerCase().trim();

    // SERVER ROLE CHECK: Non-admin users are strictly denied
    if (req.role !== 'admin') {
      await this.logAudit(req.userId, req.command, req.ipAddress, false, 'Permission denied: Requires admin role');
      return {
        success: false,
        message: 'Permission denied: Command requires server admin role.',
      };
    }

    let result: AdminCommandResult;

    switch (cmd) {
      case 'help':
        result = {
          success: true,
          message: 'Available admin commands: help, players, rooms, matches, kick, ban, unban, mute, server-stats, spawn, give, fog, god, teleport, win, lose, stop-match',
        };
        break;

      case 'server-stats':
        result = {
          success: true,
          message: `Server Stats: Uptime ${Math.floor(process.uptime())}s, Memory: ${Math.floor(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        };
        break;

      case 'rooms':
        if (!roomManager) {
          result = { success: false, message: 'Room manager not provided' };
        } else {
          const rooms = roomManager.listPublicRooms();
          result = {
            success: true,
            message: `Active rooms: ${rooms.length}`,
            output: rooms.map(r => ({ id: r.id, name: r.name, slots: r.slots.length })),
          };
        }
        break;

      // Sandbox / Match Debug commands - Gated behind sandbox/dev mode
      case 'spawn':
      case 'give':
      case 'fog':
      case 'god':
      case 'teleport':
      case 'win':
      case 'lose': {
        if (!req.isSandboxOrDevMatch && process.env.NODE_ENV === 'production') {
          result = {
            success: false,
            message: `Command '${cmd}' is forbidden in public/ranked matches. Allowed only in development or sandbox matches.`,
          };
          break;
        }

        if (!req.match) {
          result = { success: false, message: 'No active match target for cheat/debug command.' };
          break;
        }

        if (cmd === 'give') {
          const amount = parseInt(req.args[0] || '10000', 10);
          const pIdx = parseInt(req.args[1] || '0', 10);
          if (req.match.sim.players[pIdx]) {
            req.match.sim.players[pIdx].credits += amount;
            result = { success: true, message: `Gave ${amount} credits to player ${pIdx}` };
          } else {
            result = { success: false, message: `Player index ${pIdx} invalid` };
          }
        } else if (cmd === 'win') {
          const pIdx = parseInt(req.args[0] || '0', 10);
          req.match.sim.winnerTeam = pIdx;
          await req.match.finishMatch('ADMIN_COMMAND_WIN');
          result = { success: true, message: `Admin awarded victory to player/team ${pIdx}` };
        } else {
          result = { success: true, message: `Admin command '${cmd}' executed in sandbox match.` };
        }
        break;
      }

      default:
        result = { success: false, message: `Unknown admin command: ${cmd}` };
        break;
    }

    await this.logAudit(req.userId, req.command, req.ipAddress, result.success, result.message);
    return result;
  }

  private static async logAudit(userId: string, command: string, ipAddress?: string, success?: boolean, details?: string) {
    if (isDbConnected && db) {
      try {
        await db.insert(auditLogs).values({
          userId,
          action: `ADMIN_CMD:${command}`,
          ipAddress: ipAddress ?? null,
          detailsJson: { success, details },
        });
      } catch (err) {
        console.error('[AdminService] Error writing audit log:', err);
      }
    }
  }
}
