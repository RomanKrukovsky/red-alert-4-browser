import { spawnSync } from 'node:child_process';

const result = spawnSync('pnpm', ['assets:process'], { cwd: process.cwd(), stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);

const verify = spawnSync('pnpm', ['assets:verify'], { cwd: process.cwd(), stdio: 'inherit' });
if (verify.status !== 0) process.exit(verify.status ?? 1);
