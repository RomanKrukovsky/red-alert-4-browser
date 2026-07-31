import { ClientMessage, ServerMessage } from '@ra4/shared-types';
export declare function serializeClientMessage(msg: ClientMessage): string;
export declare function deserializeClientMessage(data: string): ClientMessage;
export declare function serializeServerMessage(msg: ServerMessage): string;
export declare function deserializeServerMessage(data: string): ServerMessage;
//# sourceMappingURL=protocol.d.ts.map