import { ClientMessage, ServerMessage, PlayerCommand } from '@ra4/shared-types';

export function serializeClientMessage(msg: ClientMessage): string {
  return JSON.stringify(msg);
}

export function deserializeClientMessage(data: string): ClientMessage {
  return JSON.parse(data) as ClientMessage;
}

export function serializeServerMessage(msg: ServerMessage): string {
  return JSON.stringify(msg);
}

export function deserializeServerMessage(data: string): ServerMessage {
  return JSON.parse(data) as ServerMessage;
}
