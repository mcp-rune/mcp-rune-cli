import { execa } from 'execa';
import { done, hint, notice } from '../../../core/output.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<NewContext, 'targetDir' | 'install' | 'git'>;

export async function postScaffold(ctx: Ctx): Promise<void> {
  if (ctx.git) {
    try {
      await execa('git', ['init', '--quiet'], { cwd: ctx.targetDir });
      done('initialized git repo');
    } catch (err) {
      notice(`git init failed: ${(err as Error).message}`);
    }
  }

  if (ctx.install) {
    hint('    running npm install…');
    try {
      await execa('npm', ['install'], { cwd: ctx.targetDir, stdio: 'inherit' });
      done('installed dependencies');
    } catch (err) {
      notice(`npm install failed: ${(err as Error).message}`);
    }
  }
}
