import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const RESOLUTIONS = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1672, height: 941, name: '1672x941' },
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 720, name: '1280x720' }
];

export class UIAuditor {
  private browser!: Browser;
  private targetUrl = 'http://localhost:5173';
  private artifactsDir: string;

  constructor(private prefix: 'before' | 'after' = 'before') {
    this.artifactsDir = path.resolve(process.cwd(), 'artifacts/game-doctor/ui-audit');
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
  }

  async runAudit() {
    console.log(`[UIAuditor] Starting UI visual audit (prefix: ${this.prefix})`);
    
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-web-security']
    });

    for (const res of RESOLUTIONS) {
      console.log(`[UIAuditor] Capturing ${res.name}...`);
      const context = await this.browser.newContext({
        viewport: { width: res.width, height: res.height },
        deviceScaleFactor: 1
      });
      
      const page = await context.newPage();
      
      // Navigate to Main Menu
      await page.goto(`${this.targetUrl}/#/menu`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(this.artifactsDir, `${this.prefix}_01_main_menu_${res.name}.png`) });

      // Skirmish Setup
      await page.goto(`${this.targetUrl}/#/skirmish`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(this.artifactsDir, `${this.prefix}_02_skirmish_${res.name}.png`) });

      // Start Match
      const startBtn = page.locator('button:has-text("НАЧАТЬ БИТВУ")').first();
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
      await page.waitForURL((url) => url.hash.startsWith('#/hud'), { timeout: 20000 });
      await page.waitForFunction(() => (window as any).__RA4_GAME_DOCTOR__ !== undefined, undefined, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(3000); // Wait for Babylon to render frames
      
      // Take HUD screenshot
      await page.screenshot({ path: path.join(this.artifactsDir, `${this.prefix}_03_gameplay_${res.name}.png`) });

      await context.close();
    }

    await this.browser.close();
    console.log(`[UIAuditor] UI audit complete. Artifacts saved to ${this.artifactsDir}`);
  }
}
