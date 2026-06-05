import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execa } from 'execa';
import { accent, fail, success } from '../core/color.js';
import { error, ok, space, step } from '../core/output.js';

export async function dbUpCommand(): Promise<void> {
  const cwd = process.cwd();

  if (!existsSync(resolve(cwd, 'docker-compose.yml'))) {
    error('No docker-compose.yml in this directory.');
    console.error(
      `  Scaffold one with: ${accent('rune new <name> --preset advanced --with-analysis')}`,
    );
    process.exitCode = 1;
    return;
  }

  step('docker compose up -d db');
  await execa('docker', ['compose', 'up', '-d', 'db'], { cwd, stdio: 'inherit' });

  step('waiting for db to be healthy…');
  const okHealthy = await waitForHealthy(cwd, 60_000);
  if (!okHealthy) {
    console.error(fail('  timed out — check `docker compose logs db`'));
    process.exitCode = 1;
    return;
  }
  console.log(success('  healthy'));

  step('npm run db:migrate');
  await execa('npm', ['run', 'db:migrate'], { cwd, stdio: 'inherit' });

  space();
  ok('db is up; migrations applied');
}

async function waitForHealthy(cwd: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const { stdout } = await execa(
        'docker',
        ['compose', 'ps', 'db', '--format', '{{.Health}}'],
        { cwd, timeout: 3000 },
      );
      if (stdout.trim() === 'healthy') return true;
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
