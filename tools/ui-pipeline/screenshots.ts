import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, Page } from 'playwright';

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, 'artifacts/ui-comparison');
const serverUrl = 'http://127.0.0.1:4179';
const viewports = [
  { width: 1672, height: 941, name: 'reference' },
  { width: 1920, height: 1080, name: '1080p' },
  { width: 2560, height: 1440, name: '1440p' },
  { width: 1440, height: 900, name: '16x10' },
  { width: 1366, height: 768, name: 'laptop' },
];
const screens = [
  { id: 1, route: '#/splash', ready: '.ra4-splash' },
  { id: 2, route: '#/menu', ready: '.ra4-main-menu' },
  { id: 3, route: '#/campaign', ready: '.ra4-campaign-select' },
  { id: 4, route: '#/campaign/soviet', ready: '.ra4-faction-campaign.is-soviet' },
  { id: 5, route: '#/campaign/allies', ready: '.ra4-faction-campaign.is-allies' },
  { id: 6, route: '#/campaign/coalition', ready: '.ra4-faction-campaign.is-coalition' },
  { id: 7, route: '#/campaign/chronolegion', ready: '.ra4-faction-campaign.is-chronolegion' },
  { id: 8, route: '#/strategic-map', ready: '.ra4-strategic-map' },
  { id: 9, route: '#/briefing', ready: '.ra4-briefing' },
  { id: 10, route: '#/transmission', ready: '.ra4-transmission' },
  { id: 11, route: '#/allied-command', ready: '.ra4-command-center.is-allies' },
  { id: 12, route: '#/loading', ready: '.ra4-loading' },
  { id: 13, route: '#/hud/soviet', ready: '.ra4-gameplay-hud' },
  { id: 14, route: '#/hud/allies', ready: '.ra4-gameplay-hud' },
  { id: 15, route: '#/hud/coalition', ready: '.ra4-gameplay-hud' },
  { id: 16, route: '#/hud/chronolegion', ready: '.ra4-gameplay-hud' },
  { id: 17, route: '#/skirmish', ready: '.ra4-skirmish' },
  { id: 18, route: '#/coalition-command', ready: '.ra4-command-center.is-coalition' },
  { id: 19, route: '#/loading', ready: '.ra4-loading' },
  { id: 20, route: '#/hud/soviet', ready: '.ra4-gameplay-hud' },
  { id: 21, route: '#/hud/soviet', ready: '.ra4-gameplay-hud' },
  { id: 22, route: '#/hud/allies', ready: '.ra4-gameplay-hud' },
  { id: 23, route: '#/hud/allies', ready: '.ra4-gameplay-hud' },
  { id: 24, route: '#/hud/chronolegion', ready: '.ra4-gameplay-hud' },
];

const waitForServer = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(serverUrl)).ok) return; } catch { /* server is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Vite не запустился за 15 секунд');
};

const settle = async (page: Page, selector: string) => {
  await page.waitForSelector(selector, { timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
};

const main = async () => {
  const server = spawn('pnpm', ['--filter', '@ra4/web-client', 'dev', '--host', '127.0.0.1', '--port', '4179'], { cwd: rootDir, stdio: 'ignore' });
  try {
    await waitForServer();
    const browser = await chromium.launch();
    try {
      for (const screen of screens) {
        const screenDir = path.join(artifactsDir, `screen-${String(screen.id).padStart(2, '0')}`);
        fs.mkdirSync(screenDir, { recursive: true });
        for (const viewport of viewports) {
          const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
          const page = await context.newPage();
          await page.goto(`${serverUrl}/${screen.route}`, { waitUntil: 'domcontentloaded' });
          await settle(page, screen.ready);
          const filename = viewport.name === 'reference' ? 'implementation.png' : `implementation-${viewport.name}.png`;
          await page.screenshot({ path: path.join(screenDir, filename), animations: 'disabled' });
          await context.close();
        }
        console.log(`Снят экран ${screen.id}`);
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
  }
};

main().catch((error) => { console.error(error); process.exitCode = 1; });
