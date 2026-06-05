import { buildNewContext, type NewCommandOptions } from './context.js';
import { runPipeline } from './pipeline.js';

export type { NewCommandOptions };
export { resolveMcpRuneLocalSpec } from './context.js';

export async function newCommand(projectName: string, opts: NewCommandOptions): Promise<void> {
  const ctx = buildNewContext(projectName, opts);
  await runPipeline(ctx);
}
