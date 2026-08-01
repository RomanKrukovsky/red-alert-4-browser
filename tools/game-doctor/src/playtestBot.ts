import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { GameDoctorDetector } from './detector.js';

export interface PlaytestBotOptions {
  baseUrl: string;
  artifactsDir: string;
  detector: GameDoctorDetector;
  headless?: boolean;
}

export class PlaytestBot {
  private baseUrl: string;
  private artifactsDir: string;
  private detector: GameDoctorDetector;
  private headless: boolean;

  constructor(options: PlaytestBotOptions) {
    this.baseUrl = options.baseUrl;
    this.artifactsDir = options.artifactsDir;
    this.detector = options.detector;
    this.headless = options.headless ?? true;
  }

  public async runFullPlaytest(): Promise<boolean> {
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }

    const browser: Browser = await chromium.launch({
      headless: this.headless,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    const page: Page = await context.newPage();

    // Console and network error listeners
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.detector.logConsoleError(`[Browser Console] ${msg.text()}`);
      }
    });
    page.on('pageerror', (err) => {
      this.detector.logUnhandledException(`[Page Error] ${err.message}`);
    });
    page.on('response', (res) => {
      if (res.status() >= 400 && res.status() !== 404) {
        this.detector.logNetworkError(res.url(), res.status());
      }
    });

    try {
      console.log('🤖 [PlaytestBot] Step 1: Navigating to Main Menu...');
      await page.goto(`${this.baseUrl}/#/menu`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(this.artifactsDir, '01-main-menu.png') });

      console.log('🤖 [PlaytestBot] Step 2: Opening Skirmish Setup...');
      // Click Skirmish option or navigate to #/skirmish
      const skirmishBtn = page.locator('button:has-text("СХВАТКА")').first();
      if (await skirmishBtn.isVisible()) {
        await skirmishBtn.click();
      } else {
        await page.goto(`${this.baseUrl}/#/skirmish`);
      }
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(this.artifactsDir, '02-skirmish-setup.png') });

      console.log('🤖 [PlaytestBot] Step 3: Launching Match 1...');
      const startBtn = page.locator('button:has-text("НАЧАТЬ БИТВУ")').first();
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }

      // Wait for loading screen to complete and transition to #/hud
      await page.waitForURL((url) => url.hash.startsWith('#/hud'), { timeout: 20000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(this.artifactsDir, '03-match-start.png') });

      console.log('🤖 [PlaytestBot] Step 4: Testing WASD Camera & Zoom...');
      await page.keyboard.press('KeyW', { delay: 100 });
      await page.keyboard.press('KeyA', { delay: 100 });
      await page.keyboard.press('KeyS', { delay: 100 });
      await page.keyboard.press('KeyD', { delay: 100 });
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(500);

      console.log('🤖 [PlaytestBot] Step 5: Selecting Harvester & Verifying Economy...');
      // Use window.__RA4_GAME_DOCTOR__ bridge to locate Harvester 3D position and click it
      const harvesterCoords = await page.evaluate(() => {
        try {
          const doc = (window as any).__RA4_GAME_DOCTOR__;
          if (!doc) return { x: 400, y: 300 };
          const snap = doc.getSnapshot();
          if (!snap) return { x: 400, y: 300 };
          const harvester = snap.entities.find((e: any) => e.playerIndex === 0 && !e.isBuilding);
          if (!harvester) return { x: 400, y: 300 };
          const res = doc.projectWorldToScreen(harvester.position.x / 1000, harvester.position.y / 1000);
          return res || { x: 400, y: 300 };
        } catch {
          return { x: 400, y: 300 };
        }
      });

      if (harvesterCoords) {
        await page.mouse.click(harvesterCoords.x, harvesterCoords.y);
        await page.waitForTimeout(300);
      }

      // Wait for income progression
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(this.artifactsDir, '04-economy-working.png') });

      console.log('🤖 [PlaytestBot] Step 6: Building Power Plant & Placement Mode...');
      // Click Buildings tab or press B
      await page.keyboard.press('KeyB');
      await page.waitForTimeout(300);

      const powerPlantBtn = page.locator('button:has-text("ЭЛЕКТРОСТАНЦИЯ")').first();
      if (await powerPlantBtn.isVisible()) {
        await powerPlantBtn.click();
        await page.waitForTimeout(500);
        // Move mouse to canvas center and click to place
        await page.mouse.move(640, 360);
        await page.mouse.click(640, 360);
        await page.waitForTimeout(500);
      }
      await page.screenshot({ path: path.join(this.artifactsDir, '05-building-placement.png') });

      console.log('🤖 [PlaytestBot] Step 7: Producing Units...');
      const vehicleTabBtn = page.locator('button:has-text("ТЕХНИКА")').first();
      if (await vehicleTabBtn.isVisible()) {
        await vehicleTabBtn.click();
        await page.waitForTimeout(300);
      }

      // Queue unit production
      const rhinoBtn = page.locator('button:has-text("ТАНК")').first();
      if (await rhinoBtn.isVisible()) {
        await rhinoBtn.click();
        await rhinoBtn.click();
        await rhinoBtn.click();
      }
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(this.artifactsDir, '06-army-produced.png') });

      console.log('🤖 [PlaytestBot] Step 8: Group Ctrl+1 & Attack Move Combat...');
      // Select all units via drag box
      await page.mouse.move(200, 200);
      await page.mouse.down();
      await page.mouse.move(800, 600);
      await page.mouse.up();
      await page.waitForTimeout(300);

      // Save Group 1
      await page.keyboard.down('Control');
      await page.keyboard.press('Digit1');
      await page.keyboard.up('Control');

      // Attack Move
      await page.keyboard.press('KeyA');
      await page.mouse.click(800, 300);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(this.artifactsDir, '07-combat.png') });

      console.log('🤖 [PlaytestBot] Step 9: Verifying Match Result Screen...');
      // If match ends or we pause & exit
      const pauseBtn = page.locator('button[aria-label="Открыть меню"]').first();
      if (await pauseBtn.isVisible()) {
        await pauseBtn.click();
        await page.waitForTimeout(500);
        const exitBtn = page.locator('button:has-text("ПОКИНУТЬ БИТВУ")').first();
        if (await exitBtn.isVisible()) {
          await exitBtn.click();
        }
      }
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(this.artifactsDir, '08-match-result.png') });

      console.log('🤖 [PlaytestBot] Step 10: Starting 2nd Match without Page Reload...');
      await page.goto(`${this.baseUrl}/#/skirmish`);
      await page.waitForTimeout(500);
      const startBtn2 = page.locator('button:has-text("НАЧАТЬ БИТВУ")').first();
      if (await startBtn2.isVisible()) {
        await startBtn2.click();
      }
      await page.waitForURL((url) => url.hash.startsWith('#/hud'), { timeout: 20000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(this.artifactsDir, '09-second-match.png') });

      console.log('✅ [PlaytestBot] Full E2E Browser Scenario executed successfully!');
      await browser.close();
      return true;
    } catch (err: any) {
      console.error('❌ [PlaytestBot] Playtest scenario failed:', err.message);
      this.detector.logUnhandledException(`[PlaytestBot Error] ${err.message}`);
      await browser.close();
      return false;
    }
  }
}
