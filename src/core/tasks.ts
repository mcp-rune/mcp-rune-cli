import { spinner } from '@clack/prompts';
import { muted } from './color.js';

export interface Task<Ctx = unknown> {
  start: string;
  end: string;
  while: (ctx: Ctx) => Promise<void>;
  onError?: (err: unknown, ctx: Ctx) => Promise<void> | void;
}

export interface RunTasksOptions {
  dryRun?: boolean;
}

export async function runTasks<Ctx>(
  ctx: Ctx,
  tasks: ReadonlyArray<Task<Ctx>>,
  opts: RunTasksOptions = {},
): Promise<void> {
  if (opts.dryRun) {
    for (const task of tasks) {
      console.log(muted(`[dry-run] would: ${task.start}`));
    }
    return;
  }

  for (const task of tasks) {
    const s = spinner();
    s.start(task.start);
    try {
      await task.while(ctx);
      s.stop(task.end);
    } catch (err) {
      s.error(`failed: ${task.start}`);
      if (task.onError) {
        await task.onError(err, ctx);
      } else {
        throw err;
      }
    }
  }
}
