import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execa } from 'execa';
import kleur from 'kleur';

export async function doctorCommand() {
  const results = [];

  for (const check of CHECKS) {
    const r = await check();
    if (r.skip) continue;
    results.push(r);
    print(r);
  }

  const failed = results.filter((r) => r.status === 'fail').length;
  const warned = results.filter((r) => r.status === 'warn').length;
  console.log();
  if (failed > 0) {
    console.log(kleur.red(`${failed} check(s) failed${warned ? `, ${warned} warning(s)` : ''}.`));
    process.exitCode = 1;
  } else if (warned > 0) {
    console.log(kleur.yellow(`${warned} warning(s).`));
  } else {
    console.log(kleur.green('All checks passed.'));
  }
}

function print({ status, label, hint }) {
  const icon =
    status === 'ok' ? kleur.green('✓') : status === 'warn' ? kleur.yellow('!') : kleur.red('✗');
  const suffix = hint ? kleur.dim(`  — ${hint}`) : '';
  console.log(`${icon} ${label}${suffix}`);
}

const CHECKS = [
  async () => {
    const major = Number.parseInt(process.versions.node.split('.')[0], 10);
    if (major >= 24) return { status: 'ok', label: `Node.js ${process.versions.node}` };
    if (major >= 22) {
      return {
        status: 'warn',
        label: `Node.js ${process.versions.node}`,
        hint: 'scaffolded projects require >= 24',
      };
    }
    return {
      status: 'fail',
      label: `Node.js ${process.versions.node}`,
      hint: 'CLI requires >= 22; scaffolded projects require >= 24',
    };
  },

  async () => {
    try {
      const { stdout } = await execa('npm', ['--version']);
      return { status: 'ok', label: `npm ${stdout.trim()}` };
    } catch {
      return { status: 'fail', label: 'npm', hint: 'not found in PATH' };
    }
  },

  async () => {
    const set = Boolean(process.env.GH_PACKAGES_READ_TOKEN);
    return set
      ? { status: 'ok', label: 'GH_PACKAGES_READ_TOKEN set' }
      : {
          status: 'warn',
          label: 'GH_PACKAGES_READ_TOKEN not set',
          hint: 'install of @mcp-rune/mcp-rune will fail; create at github.com/settings/tokens',
        };
  },

  async () => {
    try {
      await execa('docker', ['info'], { timeout: 3000 });
      return { status: 'ok', label: 'Docker daemon reachable' };
    } catch {
      return {
        status: 'warn',
        label: 'Docker not reachable',
        hint: 'needed for the analysis module (skip if unused)',
      };
    }
  },

  async () => {
    const pkgPath = resolve(process.cwd(), 'package.json');
    if (!existsSync(pkgPath)) return { skip: true };

    let pkg;
    try { pkg = JSON.parse(readFileSync(pkgPath, 'utf8')); } catch { return { skip: true }; }
    if (!pkg.dependencies?.['@mcp-rune/mcp-rune']) return { skip: true };

    const installed = existsSync(resolve(process.cwd(), 'node_modules/@mcp-rune/mcp-rune'));
    return installed
      ? { status: 'ok', label: '@mcp-rune/mcp-rune installed in this project' }
      : {
          status: 'warn',
          label: '@mcp-rune/mcp-rune not installed in this project',
          hint: 'run `npm install`',
        };
  },

  async () => {
    if (!existsSync(resolve(process.cwd(), 'docker-compose.yml'))) return { skip: true };
    try {
      const { stdout } = await execa('docker', ['compose', 'ps', '--format', 'json'], {
        cwd: process.cwd(),
        timeout: 3000,
      });
      const running = stdout.trim().length > 0;
      return running
        ? { status: 'ok', label: 'docker-compose services running' }
        : { status: 'warn', label: 'docker-compose.yml present but no services running', hint: 'run `rune db up`' };
    } catch {
      return { status: 'warn', label: 'docker-compose.yml present but compose not reachable' };
    }
  },
];
