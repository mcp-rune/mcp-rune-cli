import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execa } from 'execa';

export interface RunOpts {
  stdio?: 'inherit' | 'pipe';
}

export async function startDockerDb(cwd: string, opts: RunOpts = {}): Promise<void> {
  await execa('docker', ['compose', 'up', '-d', 'db'], {
    cwd,
    stdio: opts.stdio ?? 'pipe',
  });
}

export async function waitForDbHealthy(cwd: string, timeoutMs: number): Promise<boolean> {
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

export async function runMigrations(cwd: string, opts: RunOpts = {}): Promise<void> {
  await execa('npm', ['run', 'db:migrate'], {
    cwd,
    stdio: opts.stdio ?? 'pipe',
  });
}

/**
 * Upsert DATABASE_URL into .env. Seeds from .env.example when .env is absent.
 * Rewrites the existing DATABASE_URL line in place (commented or not) so we
 * don't accumulate duplicate keys across re-runs.
 */
export function writeEnvDatabaseUrl(cwd: string, url: string): void {
  const envPath = resolve(cwd, '.env');
  const examplePath = resolve(cwd, '.env.example');

  let content = '';
  if (existsSync(envPath)) {
    content = readFileSync(envPath, 'utf-8');
  } else if (existsSync(examplePath)) {
    content = readFileSync(examplePath, 'utf-8');
  }

  const lines = content.split(/\r?\n/);
  let replaced = false;
  const updated = lines.map((line) => {
    if (/^\s*#?\s*DATABASE_URL\s*=/.test(line)) {
      replaced = true;
      return `DATABASE_URL=${url}`;
    }
    return line;
  });

  if (!replaced) {
    if (updated.length > 0 && updated[updated.length - 1] !== '') {
      updated.push('');
    }
    updated.push(`DATABASE_URL=${url}`);
  }

  writeFileSync(envPath, updated.join('\n'));
}
