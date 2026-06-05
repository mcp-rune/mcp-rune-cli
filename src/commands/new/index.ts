import { readFileSync } from 'node:fs';
import { runTasks } from '../../core/tasks.js';
import { nextSteps } from './actions/next-steps.js';
import { buildNewContext, type NewCommandOptions } from './context.js';
import { runPipeline } from './pipeline.js';

export type { NewCommandOptions };
export { resolveMcpRuneLocalSpec } from './context.js';

function readCliVersion(): string {
  const url = new URL('../../../package.json', import.meta.url);
  const pkg = JSON.parse(readFileSync(url, 'utf8')) as { version: string };
  return pkg.version;
}

export async function newCommand(projectName: string, opts: NewCommandOptions): Promise<void> {
  const ctx = buildNewContext(projectName, opts, { cliVersion: readCliVersion() });
  await runPipeline(ctx);
  await runTasks(ctx, ctx.tasks, { dryRun: ctx.dryRun });
  await nextSteps(ctx);
}
