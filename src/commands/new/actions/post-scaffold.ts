import { execa } from 'execa';
import { notice } from '../../../core/output.js';
import type { NewContext } from '../context.js';

type Ctx = Pick<NewContext, 'targetDir' | 'install' | 'git' | 'verbose' | 'tasks'>;

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
          env: {
            ...process.env,
            // @huggingface/transformers (transitive via @mcp-rune/mcp-rune)
            // pulls sharp. On machines with a global libvips (e.g. `brew
            // install vips`), sharp's install/check.js skips its prebuilt
            // binary and tries to build from source, which fails because
            // node-addon-api isn't in its runtime deps. Always prefer the
            // prebuilt — sharp ships one for every common platform.
            SHARP_IGNORE_GLOBAL_LIBVIPS: '1',
          },
        });
      },
      onError(err) {
        notice(`npm install failed: ${(err as Error).message}`);
      },
    });
  }
}
