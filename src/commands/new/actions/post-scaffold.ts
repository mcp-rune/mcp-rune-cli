import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execa } from 'execa';
import {
  runMigrations,
  startDockerDb,
  waitForDbHealthy,
  writeEnvDatabaseUrl,
} from '../../../core/db-setup.js';
import { notice } from '../../../core/output.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<
  NewContext,
  'targetDir' | 'install' | 'git' | 'verbose' | 'tasks' | 'dbSetup' | 'databaseUrl'
>;

export async function postScaffold(ctx: Ctx): Promise<void> {
  if (ctx.git) {
    ctx.tasks.push({
      start: 'Initializing git repo',
      end: 'Initialized git repo',
      async while(c) {
        await execa('git', ['init', '--quiet'], { cwd: c.targetDir });
      },
      onError(err) {
        notice(`git init failed: ${(err as Error).message}`);
      },
    });
  }

  if (ctx.install) {
    ctx.tasks.push({
      start: 'Installing dependencies',
      end: 'Installed dependencies',
      async while(c) {
        await execa('npm', ['install'], {
          cwd: c.targetDir,
          stdio: c.verbose ? 'inherit' : 'pipe',
        });
      },
      onError(err) {
        notice(`npm install failed: ${(err as Error).message}`);
      },
    });
  }

  if (ctx.dbSetup === 'docker') {
    ctx.tasks.push({
      start: 'Starting docker pgvector',
      end: 'Started docker pgvector',
      async while(c) {
        if (!existsSync(resolve(c.targetDir, 'docker-compose.yml'))) {
          throw new Error('docker-compose.yml missing from scaffolded project');
        }
        await startDockerDb(c.targetDir);
        const healthy = await waitForDbHealthy(c.targetDir, 60_000);
        if (!healthy) {
          throw new Error(
            'docker db did not become healthy within 60s — check `docker compose logs db`',
          );
        }
      },
      onError(err) {
        notice(`docker setup failed: ${(err as Error).message}`);
        notice('run `rune db up` from the project directory to retry');
      },
    });
  } else if (ctx.dbSetup === 'existing-url' && ctx.databaseUrl) {
    const url = ctx.databaseUrl;
    ctx.tasks.push({
      start: 'Writing DATABASE_URL to .env',
      end: 'Wrote DATABASE_URL to .env',
      async while(c) {
        writeEnvDatabaseUrl(c.targetDir, url);
      },
      onError(err) {
        notice(`.env write failed: ${(err as Error).message}`);
      },
    });
  }

  if (ctx.dbSetup === 'docker' || ctx.dbSetup === 'existing-url') {
    ctx.tasks.push({
      start: 'Running migrations',
      end: 'Ran migrations',
      async while(c) {
        await runMigrations(c.targetDir, { stdio: c.verbose ? 'inherit' : 'pipe' });
      },
      onError(err) {
        notice(`migrations failed: ${(err as Error).message}`);
        notice('run `npm run db:migrate` from the project directory to retry');
      },
    });
  }
}
