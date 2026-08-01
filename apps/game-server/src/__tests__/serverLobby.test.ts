import { describe, it, expect } from 'vitest';
import { RoomManager } from '../lobby/roomManager';
import { FactionId, PlayerType } from '@ra4/shared-types';

describe('Server Lobby & Room Lifecycle Suite', () => {
  it('should create room and allocate default player slots', () => {
    const manager = new RoomManager();
    const room = manager.createRoom('Skirmish Arena', 'host-1', false);

    expect(room.id).toBeDefined();
    expect(room.name).toEqual('Skirmish Arena');
    expect(room.slots.length).toBeGreaterThanOrEqual(2);
  });

  it('should allow joining room and assign empty slot', () => {
    const manager = new RoomManager();
    const room = manager.createRoom('Custom Room', 'host-1', false);

    const { slotIndex } = manager.joinRoom(room.id, 'Player Two', 'user-2');
    expect(slotIndex).toBeDefined();

    const updatedRoom = manager.getRoom(room.id);
    expect(updatedRoom?.slots[slotIndex].name).toEqual('Player Two');
    expect(updatedRoom?.slots[slotIndex].isConnected).toBe(true);
  });

  it('should update slot faction, team, and ready states', () => {
    const manager = new RoomManager();
    const room = manager.createRoom('Test Room', 'host-1', false);

    manager.setSlotConfig(room.id, 0, FactionId.ALLIANCE, PlayerType.HUMAN, 1);
    manager.setReady(room.id, 0, true);

    const updated = manager.getRoom(room.id);
    expect(updated?.slots[0].factionId).toEqual(FactionId.ALLIANCE);
    expect(updated?.slots[0].team).toEqual(1);
    expect(updated?.slots[0].isReady).toBe(true);
  });

  it('should migrate host when host leaves room', () => {
    const manager = new RoomManager();
    const room = manager.createRoom('Host Test Room', 'user-1', false);

    manager.joinRoom(room.id, 'Host Player', 'user-1');
    manager.joinRoom(room.id, 'Second Player', 'user-2');

    manager.leaveRoom(room.id, 0);

    const updated = manager.getRoom(room.id);
    expect(updated?.hostIndex).toEqual(1);
  });
});
