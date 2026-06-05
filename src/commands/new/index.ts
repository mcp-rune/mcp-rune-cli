import { runTasks } from '../../core/tasks.js';
import { nextSteps } from './actions/next-steps.js';
import { buildNewContext, type NewCommandOptions } from './context.js';
import { runPipeline } from './pipeline.js';

export type { NewCommandOptions };
export { resolveMcpRuneLocalSpec } from './context.js';

export async function newCommand(projectName: string, opts: NewCommandOptions): Promise<void> {
  const ctx = buildNewContext(projectName, opts);
  await runPipeline(ctx);
  await runTasks(ctx, ctx.tasks, { dryRun: ctx.dryRun });
  await nextSteps(ctx);
}
