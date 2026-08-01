import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const rootDir = process.cwd();
const requiredFiles = [
  'docs/ui/REFERENCE_SCREEN_CATALOG.md',
  'packages/ui/src/tokens/colors.css',
  'packages/ui/src/tokens/spacing.css',
  'packages/ui/src/tokens/typography.css',
  'packages/ui/src/tokens/effects.css',
  'packages/ui/src/tokens/layout.css',
  'apps/web-client/src/ui/view-models/gameplayHUDViewModel.ts',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(rootDir, file))) throw new Error(`Отсутствует обязательный файл: ${file}`);
}

const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, { cwd: rootDir, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} завершился с кодом ${result.status}`);
};

run('pnpm', ['--filter', '@ra4/web-client', 'typecheck']);
run('pnpm', ['exec', 'vitest', 'run', 'apps/web-client/src/ui']);

const main = async () => {
  const serverUrl = 'http://127.0.0.1:4180';
  const server = spawn('pnpm', ['--filter', '@ra4/web-client', 'dev', '--host', '127.0.0.1', '--port', '4180'], { cwd: rootDir, stdio: 'ignore' });
  try {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try { if ((await fetch(serverUrl)).ok) break; } catch { /* server is still starting */ }
      if (attempt === 59) throw new Error('Тестовый сервер не запустился');
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
      const consoleErrors: string[] = [];
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      await page.goto(`${serverUrl}/#/splash`);
      await page.locator('.ra4-splash').click();
      await page.waitForSelector('.ra4-main-menu');
      await page.getByRole('button', { name: 'СХВАТКА' }).click();
      await page.waitForSelector('.ra4-skirmish');
      await page.getByRole('button', { name: /НАЧАТЬ БИТВУ/ }).click();
      await page.waitForSelector('.ra4-loading');
      await page.waitForSelector('.ra4-gameplay-hud', { timeout: 20_000 });
      await page.keyboard.press('Escape');
      await page.waitForSelector('.ra4-pause-overlay');
      await page.getByRole('button', { name: /ВЕРНУТЬСЯ В ИГРУ/ }).click();
      await page.waitForSelector('.ra4-pause-overlay', { state: 'detached' });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: /ВЫЙТИ В МЕНЮ/ }).click();
      await page.waitForSelector('.ra4-main-menu');
      await page.goto(`${serverUrl}/#/victory`);
      await page.waitForSelector('.ra4-match-result.is-victory');
      await page.goto(`${serverUrl}/#/defeat`);
      await page.waitForSelector('.ra4-match-result.is-defeat');
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForSelector('.ra4-result-actions');
      if (consoleErrors.length > 0) throw new Error(`Ошибки консоли: ${consoleErrors.join('\n')}`);
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
  }
};

main().then(() => console.log('UI: каталог, типы, ViewModel и основной пользовательский путь проверены.')).catch((error) => { console.error(error); process.exitCode = 1; });
