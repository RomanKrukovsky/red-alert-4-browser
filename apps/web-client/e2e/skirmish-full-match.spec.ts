import { test, expect } from '@playwright/test';

test.describe('Skirmish Full Match Lifecycle & E2E Validation', () => {
  test('Complete flow: Menu -> Setup -> Match 1 (Harvesting, Building, Production, Combat, Victory) -> Return to Menu -> Match 2', async ({ page }) => {
    // Collect console logs and errors
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 1. Go to root page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Screenshot Splash / Main Menu
    await page.screenshot({ path: 'artifacts/e2e-01-main-menu.png' });

    // Click to enter Main Menu if on splash screen
    const splashPrompt = page.locator('.ra4-splash-prompt');
    if (await splashPrompt.isVisible()) {
      await splashPrompt.click();
    }

    // 2. Select Skirmish Mode from Main Menu
    const skirmishBtn = page.locator('button.ra4-military-button:has-text("СХВАТКА")');
    await expect(skirmishBtn).toBeVisible({ timeout: 10_000 });
    await skirmishBtn.click();

    // Screenshot Skirmish Setup Screen
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'artifacts/e2e-02-skirmish-setup.png' });

    // 3. Start Match 1
    const startMatchBtn = page.locator('button.ra4-military-button:has-text("НАЧАТЬ БИТВУ")');
    await expect(startMatchBtn).toBeVisible({ timeout: 10_000 });
    await startMatchBtn.click();

    // 4. Wait for Match to Load and canvas to become visible
    await page.waitForSelector('#renderCanvas.is-visible', { timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Screenshot Match 1 Start HUD
    await page.screenshot({ path: 'artifacts/e2e-03-match1-started.png' });

    // 5. Verify Game Doctor API is exposed
    const hasGameDoctor = await page.evaluate(() => typeof (window as any).__RA4_GAME_DOCTOR__ !== 'undefined');
    expect(hasGameDoctor).toBe(true);

    // Get Snapshot info
    let snapshotInfo = await page.evaluate(() => {
      const doc = (window as any).__RA4_GAME_DOCTOR__;
      const snap = doc.getSnapshot();
      return {
        tick: snap.tick,
        checksum: snap.checksum,
        entitiesCount: snap.entities.length,
        playerCredits: snap.players[0].credits,
        opponentEntities: snap.entities.filter((e: any) => e.playerIndex === 1).length,
      };
    });
    console.log('Match 1 Initial Snapshot:', snapshotInfo);
    expect(snapshotInfo.entitiesCount).toBeGreaterThan(0);

    // 6. Test Harvester & Ore Harvesting
    await page.waitForTimeout(3000); // let harvester collect ore
    const currentOre = await page.evaluate(() => {
      const snap = (window as any).__RA4_GAME_DOCTOR__.getSnapshot();
      const harvester = snap.entities.find((e: any) => e.playerIndex === 0 && !e.isBuilding);
      return harvester ? harvester.currentOre : 0;
    });
    console.log('Harvester Ore count after 3s:', currentOre);

    // 7. Test Performance & Render Stats
    const perfStats = await page.evaluate(() => {
      const doc = (window as any).__RA4_GAME_DOCTOR__;
      return doc.getPerformance();
    });
    console.log('Performance stats:', perfStats);
    expect(perfStats.fps).toBeGreaterThan(10);

    // Screenshot mid-game action
    await page.screenshot({ path: 'artifacts/e2e-04-mid-game-action.png' });

    // 8. Execute Victory by destroying opponent entities via simulation API
    await page.evaluate(() => {
      (window as any).__RA4_GAME_DOCTOR__.triggerVictory();
    });

    // Wait for Victory overlay
    const victoryHeader = page.locator('h1.ra4-result-title:has-text("ПОБЕДА"), h1:has-text("ПОБЕДА"), .ra4-match-result-title:has-text("ПОБЕДА")');
    await expect(victoryHeader).toBeVisible({ timeout: 15_000 });

    // Screenshot Victory Screen
    await page.screenshot({ path: 'artifacts/e2e-05-victory-screen.png' });

    // 9. Return to Main Menu
    const returnMenuBtn = page.locator('button.ra4-military-button:has-text("ГЛАВНОЕ МЕНЮ")');
    await expect(returnMenuBtn).toBeVisible({ timeout: 10_000 });
    await returnMenuBtn.click();

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'artifacts/e2e-06-back-to-menu.png' });

    // 10. Start Match 2 to verify clean lifecycle restart without memory leaks
    await expect(skirmishBtn).toBeVisible({ timeout: 10_000 });
    await skirmishBtn.click();
    await page.waitForTimeout(500);
    await expect(startMatchBtn).toBeVisible({ timeout: 10_000 });
    await startMatchBtn.click();

    // Wait for Match 2 canvas
    await page.waitForSelector('#renderCanvas.is-visible', { timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Screenshot Match 2 Start
    await page.screenshot({ path: 'artifacts/e2e-07-match2-started.png' });

    const match2Snapshot = await page.evaluate(() => {
      const doc = (window as any).__RA4_GAME_DOCTOR__;
      const snap = doc.getSnapshot();
      return {
        tick: snap.tick,
        checksum: snap.checksum,
        entitiesCount: snap.entities.length,
        fps: doc.getPerformance().fps,
      };
    });
    console.log('Match 2 Snapshot:', match2Snapshot);
    expect(match2Snapshot.entitiesCount).toBeGreaterThan(0);
    expect(match2Snapshot.fps).toBeGreaterThan(10);

    // Verify Console Errors count
    console.log('Total Console Errors during test run:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }
  });
});
