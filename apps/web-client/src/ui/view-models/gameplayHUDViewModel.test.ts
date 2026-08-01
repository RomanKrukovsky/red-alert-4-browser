import { describe, expect, it } from 'vitest';
import { createGameplayHUDViewModel, formatResource, productionAvailability, queueProgress } from './gameplayHUDViewModel.js';

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
});

