import { resolve } from 'node:path';
import { fail, muted, success, warn } from '../../core/color.js';
import { heading, space } from '../../core/output.js';
import { CHECKS } from './env-checks.js';
import { runProjectChecks } from './project-validation.js';

export type CheckResult =
  | { status: 'ok'; label: string; hint?: string }
  | { status: 'warn'; label: string; hint?: string }
  | { status: 'fail'; label: string; hint?: string }
  | { skip: true };

export interface DoctorOptions {
  /** Path to a scaffolded project to additionally lint with validateRegistries. */
  project?: string | true;
}

export async function doctorCommand(opts: DoctorOptions = {}): Promise<void> {
  const results: Exclude<CheckResult, { skip: true }>[] = [];

  for (const check of CHECKS) {
    const r = await check();
    if ('skip' in r) continue;
    results.push(r);
    print(r);
  }

  if (opts.project) {
    const projectDir = opts.project === true ? process.cwd() : resolve(opts.project);
    space();
    heading(`Project schema check (${projectDir})`);
    const projectResults = await runProjectChecks(projectDir);
    for (const r of projectResults) {
      results.push(r);
      print(r);
    }
  }

  const failed = results.filter((r) => r.status === 'fail').length;
  const warned = results.filter((r) => r.status === 'warn').length;
  space();
  if (failed > 0) {
    console.log(fail(`${failed} check(s) failed${warned ? `, ${warned} warning(s)` : ''}.`));
    process.exitCode = 1;
  } else if (warned > 0) {
    console.log(warn(`${warned} warning(s).`));
  } else {
    console.log(success('All checks passed.'));
  }
}

function print(r: Exclude<CheckResult, { skip: true }>): void {
  const icon =
    r.status === 'ok' ? success('✓') : r.status === 'warn' ? warn('!') : fail('✗');
  const suffix = r.hint ? muted(`  — ${r.hint}`) : '';
  console.log(`${icon} ${r.label}${suffix}`);
}
