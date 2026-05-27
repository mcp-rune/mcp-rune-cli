import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execa } from 'execa';
import kleur from 'kleur';

export async function dbUpCommand(): Promise<void> {
  const cwd = process.cwd();

  if (!existsSync(resolve(cwd, 'docker-compose.yml'))) {
    console.error(kleur.red('No docker-compose.yml in this directory.'));
    console.error(
      `  Scaffold one with: ${kleur.cyan('rune new <name> --preset advanced --with-analysis')}`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(kleur.bold('▸ docker compose up -d db'));
  await execa('docker', ['compose', 'up', '-d', 'db'], { cwd, stdio: 'inherit' });

  console.log(kleur.bold('▸ waiting for db to be healthy…'));
  const ok = await waitForHealthy(cwd, 60_000);
  if (!ok) {
    console.error(kleur.red('  timed out — check `docker compose logs db`'));
    process.exitCode = 1;
    return;
  }
  console.log(kleur.green('  healthy'));

  console.log(kleur.bold('▸ npm run db:migrate'));
  await execa('npm', ['run', 'db:migrate'], { cwd, stdio: 'inherit' });

  console.log();
  console.log(kleur.green('✓ db is up; migrations applied'));
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
