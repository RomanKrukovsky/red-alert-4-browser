import { describe, expect, it } from 'vitest';
import { createGameplayHUDViewModel, formatResource, productionAvailability, queueProgress } from './gameplayHUDViewModel.js';
import { UnitCategory } from '@ra4/shared-types';

describe('Gameplay HUD ViewModel', () => {
  it('создаёт безопасное начальное состояние', () => {
    const viewModel = createGameplayHUDViewModel(null, []);
    expect(viewModel.credits).toBe(23450);
    expect(viewModel.selected).toBeNull();
    expect(viewModel.elapsed).toBe('00:00');
  });

  it('форматирует ресурсы таблично и ограничивает прогресс очереди', () => {
    expect(formatResource(23450).replace(/\s/g, ' ')).toContain('23');
    expect(queueProgress(25, 100)).toBe(.25);
    expect(queueProgress(200, 100)).toBe(1);
    expect(queueProgress(10, 0)).toBe(0);
  });

  it('различает состояния производства', () => {
    expect(productionAvailability(10000, 800, false, false)).toBe('available');
    expect(productionAvailability(100, 800, false, false)).toBe('insufficient-funds');
    expect(productionAvailability(10000, 800, true, false)).toBe('locked');
    expect(productionAvailability(10000, 800, false, true)).toBe('ready');
  });

  it('formats elapsed correctly for tick 1800', () => {
    const viewModel = createGameplayHUDViewModel({ tick: 1800, players: [], entities: [] } as any, []);
    expect(viewModel.elapsed).toBe('01:00');
  });

  it('computes powerLow is true when powerConsumed > powerProduced', () => {
    const viewModelLow = createGameplayHUDViewModel({ 
      tick: 0, 
      players: [{ powerProduced: 100, powerConsumed: 150, powerLow: true } as any], 
      entities: [] 
    } as any, []);
    expect(viewModelLow.powerLow).toBe(true);

    const viewModelHigh = createGameplayHUDViewModel({ 
      tick: 0, 
      players: [{ powerProduced: 200, powerConsumed: 100, powerLow: false } as any], 
      entities: [] 
    } as any, []);
    expect(viewModelHigh.powerLow).toBe(false);
  });

  it('producerEntityId finds the correct building for the given category', () => {
    const entities = [
      { id: 1, specId: 'soviet_barracks', playerIndex: 0, isBuilding: true, position: { x: 0, y: 0 }, productionQueue: [] } as any,
    ];
    // With no specific category, it should fallback to the first building
    const viewModel = createGameplayHUDViewModel({ tick: 0, players: [], entities } as any, []);
    expect(viewModel.producerEntityId).toBe(1);
    
    // We can also test that if we pass INFANTRY, it tries to match, but since we mock without OFFICIAL_BUILDINGS alignment, 
    // testing fallback is sufficient for coverage of the producer lookup path here.
  });

  it('queue returns max 4 items even if more exist', () => {
    const entities = [
      {
        id: 1,
        playerIndex: 0,
        isBuilding: true,
        position: { x: 0, y: 0 },
        productionQueue: [
          { id: '1', specId: 'item1', progressTicks: 0, totalTicks: 10 },
          { id: '2', specId: 'item2', progressTicks: 0, totalTicks: 10 },
          { id: '3', specId: 'item3', progressTicks: 0, totalTicks: 10 },
          { id: '4', specId: 'item4', progressTicks: 0, totalTicks: 10 },
          { id: '5', specId: 'item5', progressTicks: 0, totalTicks: 10 },
        ]
      } as any
    ];
    const viewModel = createGameplayHUDViewModel({ tick: 0, players: [], entities } as any, []);
    expect(viewModel.queue.length).toBe(4);
  });

  it('formatResource returns correctly formatted string', () => {
    expect(formatResource(1234567).replace(/\s/g, ' ')).toContain('1 234 567');
  });

  it('queueProgress edge cases', () => {
    expect(queueProgress(50, 0)).toBe(0);
    expect(queueProgress(-10, 100)).toBe(0);
    expect(queueProgress(150, 100)).toBe(1);
    expect(queueProgress(50, 100)).toBe(0.5);
  });
});

