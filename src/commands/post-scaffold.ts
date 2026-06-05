import { execa } from 'execa';
import { done, hint, notice } from '../core/output.js';

export interface PostScaffoldOptions {
  install: boolean;
  git: boolean;
}

export async function postScaffold(cwd: string, opts: PostScaffoldOptions): Promise<void> {
  if (opts.git) {
    try {
      await execa('git', ['init', '--quiet'], { cwd });
      done('initialized git repo');
    } catch (err) {
      notice(`git init failed: ${(err as Error).message}`);
    }
  }

  if (opts.install) {
    hint('    running npm install…');
    try {
      await execa('npm', ['install'], { cwd, stdio: 'inherit' });
      done('installed dependencies');
    } catch (err) {
      notice(`npm install failed: ${(err as Error).message}`);
    }
  }
}
