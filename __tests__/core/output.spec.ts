import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  done,
  error,
  heading,
  hint,
  info,
  listAdd,
  listEdit,
  notice,
  ok,
  scaffoldHeader,
  space,
  step,
} from '../../src/core/output.js';

// Strip ANSI color codes so assertions test the text shape, not the colors.
const stripAnsi = (s: string): string =>
  // eslint-disable-next-line no-control-regex
  s.replace(/\[[0-9;]*m/g, '');

describe('output helpers', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errSpy.mockRestore();
  });

  const lastLog = (spy: ReturnType<typeof vi.spyOn>): string =>
    stripAnsi(String(spy.mock.calls.at(-1)?.[0] ?? ''));

  it('info writes plain to stdout', () => {
    info('hello');
    expect(lastLog(logSpy)).toBe('hello');
  });

  it('hint prefixes nothing but dims', () => {
    hint('  detail');
    expect(lastLog(logSpy)).toBe('  detail');
  });

  it('space writes a blank line', () => {
    space();
    expect(logSpy).toHaveBeenCalledWith();
  });

  it('step renders the arrow prefix', () => {
    step('docker compose up');
    expect(lastLog(logSpy)).toBe('▸ docker compose up');
  });

  it('done renders the cyan check', () => {
    done('wrote files');
    expect(lastLog(logSpy)).toBe('✓ wrote files');
  });

  it('ok renders the success line with check', () => {
    ok('all good');
    expect(lastLog(logSpy)).toBe('✓ all good');
  });

  it('notice writes ! prefix to stderr', () => {
    notice('something off');
    expect(lastLog(warnSpy)).toBe('! something off');
  });

  it('error writes plain to stderr', () => {
    error('boom');
    expect(lastLog(errSpy)).toBe('boom');
  });

  it('heading writes a bold line', () => {
    heading('Next steps:');
    expect(lastLog(logSpy)).toBe('Next steps:');
  });

  it('listAdd / listEdit render path markers', () => {
    listAdd('src/a.js');
    expect(lastLog(logSpy)).toBe('  + src/a.js');
    listEdit('src/b.js');
    expect(lastLog(logSpy)).toBe('  ~ src/b.js');
  });

  it('scaffoldHeader renders project + suffix', () => {
    scaffoldHeader('my-server', 'simple');
    expect(lastLog(logSpy)).toBe('Scaffolding my-server (simple)…');
  });
});
