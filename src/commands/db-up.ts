import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { accent, fail, success } from '../core/color.js';
import {
  runMigrations,
  startDockerDb,
  waitForDbHealthy,
} from '../core/db-setup.js';
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
  await startDockerDb(cwd, { stdio: 'inherit' });

  step('waiting for db to be healthy…');
  const okHealthy = await waitForDbHealthy(cwd, 60_000);
  if (!okHealthy) {
    console.error(fail('  timed out — check `docker compose logs db`'));
    process.exitCode = 1;
    return;
  }
  console.log(success('  healthy'));

  step('npm run db:migrate');
  await runMigrations(cwd, { stdio: 'inherit' });

  space();
  ok('db is up; migrations applied');
}
