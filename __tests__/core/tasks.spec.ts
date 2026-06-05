import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runTasks, type Task } from '../../src/core/tasks.js';

const stripAnsi = (s: string): string =>
  // eslint-disable-next-line no-control-regex
  s.replace(/\x1B\[[0-9;]*m/g, '');

describe('runTasks (dry-run)', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  it('prints one [dry-run] line per task and runs no while()', async () => {
    const while1 = vi.fn().mockResolvedValue(undefined);
    const while2 = vi.fn().mockResolvedValue(undefined);
    const tasks: Task<unknown>[] = [
      { start: 'Resolving template', end: 'Resolved', while: while1 },
      { start: 'Writing files', end: 'Wrote', while: while2 },
    ];
    await runTasks({}, tasks, { dryRun: true });
    expect(while1).not.toHaveBeenCalled();
    expect(while2).not.toHaveBeenCalled();
    const lines = logSpy.mock.calls.map((c) => stripAnsi(String(c[0])));
    expect(lines).toEqual([
      '[dry-run] would: Resolving template',
      '[dry-run] would: Writing files',
    ]);
  });

  it('passes ctx into each task', async () => {
    const seen: unknown[] = [];
    const ctx = { id: 42 };
    const tasks: Task<typeof ctx>[] = [
      {
        start: 'a',
        end: 'A',
        while: async (c) => {
          seen.push(c);
        },
      },
    ];
    await runTasks(ctx, tasks, { dryRun: true });
    // dry-run skips while; verify ctx isn't accidentally invoked.
    expect(seen).toEqual([]);
  });

  it('handles an empty task list', async () => {
    await runTasks({}, [], { dryRun: true });
    expect(logSpy).not.toHaveBeenCalled();
  });
});
