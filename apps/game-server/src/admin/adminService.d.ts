import { UserRole } from '../auth/service.js';
import { AuthoritativeMatchRuntime } from '../matches/matchRuntime.js';
import { RoomManager } from '../lobby/roomManager.js';
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
export declare class AdminService {
    /**
     * Execute an administrative command with server-side role validation and audit logging.
     */
    static executeCommand(req: AdminCommandRequest, roomManager?: RoomManager): Promise<AdminCommandResult>;
    private static logAudit;
}
//# sourceMappingURL=adminService.d.ts.map