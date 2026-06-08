import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assertAdvancedOnly,
  assertTemplateExclusivity,
  buildNewContext,
} from '#src/commands/new/context.js';

describe('assertTemplateExclusivity', () => {
  it('passes when neither template flag is set', () => {
    expect(() => assertTemplateExclusivity({})).not.toThrow();
  });

  it('rejects both --template and --offline-template together', () => {
    expect(() =>
      assertTemplateExclusivity({ template: 'bookshelf', offlineTemplate: '/x' }),
    ).toThrow(/cannot be combined/);
  });

  it('rejects --template combined with preset-only flag', () => {
    expect(() => assertTemplateExclusivity({ template: 'bookshelf', preset: 'simple' })).toThrow(
      /--preset cannot be combined/,
    );
  });

  it('rejects --offline-template combined with --models', () => {
    expect(() => assertTemplateExclusivity({ offlineTemplate: '/x', models: 'Book' })).toThrow(
      /--models cannot be combined/,
    );
  });
});

describe('assertAdvancedOnly', () => {
  it('passes when preset is advanced', () => {
    expect(() => assertAdvancedOnly({ preset: 'advanced', logger: 'pino' })).not.toThrow();
  });

  it('passes when no preset and no --yes (interactive)', () => {
    expect(() => assertAdvancedOnly({ logger: 'pino' })).not.toThrow();
  });

  it('rejects extension flag with --preset simple', () => {
    expect(() => assertAdvancedOnly({ preset: 'simple', logger: 'pino' })).toThrow(
      /--logger is only valid with --preset advanced/,
    );
  });

  it('rejects extension flag with --yes and no preset (i.e. defaults to simple)', () => {
    expect(() => assertAdvancedOnly({ yes: true, tracing: 'langfuse' })).toThrow(
      /--tracing is only valid with --preset advanced/,
    );
  });
});

describe('buildNewContext', () => {
  let parent: string;
  let originalCwd: string;

  beforeEach(() => {
    parent = realpathSync(mkdtempSync(join(tmpdir(), 'rune-ctx-')));
    originalCwd = process.cwd();
    process.chdir(parent);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(parent, { recursive: true, force: true });
  });

  it('derives targetDir from cwd + projectName', () => {
    const ctx = buildNewContext('my-server', {});
    expect(ctx.targetDir).toBe(join(parent, 'my-server'));
    expect(ctx.projectName).toBe('my-server');
  });

  it('throws if targetDir already exists', () => {
    const ctx = buildNewContext('first', {});
    mkdirSync(ctx.targetDir);
    expect(() => buildNewContext('first', {})).toThrow(/already exists/);
  });

  it('infers scaffoldMode=preset when --yes is set', () => {
    const ctx = buildNewContext('p', { yes: true });
    expect(ctx.scaffoldMode).toBe('preset');
    expect(ctx.yes).toBe(true);
  });

  it('infers scaffoldMode=preset when --preset is set', () => {
    const ctx = buildNewContext('p', { preset: 'simple' });
    expect(ctx.scaffoldMode).toBe('preset');
  });

  it('infers scaffoldMode=template when --template is set', () => {
    const ctx = buildNewContext('p', { template: 'bookshelf' });
    expect(ctx.scaffoldMode).toBe('template');
    expect(ctx.template).toBe('bookshelf');
  });

  it('infers scaffoldMode=offlineTemplate when --offline-template is set', () => {
    const ctx = buildNewContext('p', { offlineTemplate: '/tmp/x' });
    expect(ctx.scaffoldMode).toBe('offlineTemplate');
    expect(ctx.offlineTemplate).toBe('/tmp/x');
  });

  it('leaves scaffoldMode undefined for the interactive path', () => {
    const ctx = buildNewContext('p', {});
    expect(ctx.scaffoldMode).toBeUndefined();
  });

  it('install defaults to true; --no-install sets false', () => {
    expect(buildNewContext('a', {}).install).toBe(true);
    expect(buildNewContext('b', { install: false }).install).toBe(false);
  });

  it('git defaults to true; --no-git sets false', () => {
    expect(buildNewContext('a', {}).git).toBe(true);
    expect(buildNewContext('b', { git: false }).git).toBe(false);
  });

  it('propagates new advanced flags onto the context', () => {
    const ctx = buildNewContext('p', {
      preset: 'advanced',
      apiConvention: 'custom',
      apiClient: 'axios',
      searchAdapter: 'custom',
      vectorStorage: true,
      sharedModelAttrs: true,
    });
    expect(ctx.apiConvention).toBe('custom');
    expect(ctx.apiClient).toBe('axios');
    expect(ctx.searchAdapter).toBe('custom');
    expect(ctx.vectorStorage).toBe(true);
    expect(ctx.sharedModelAttrs).toBe(true);
  });
});

describe('assertAdvancedOnly (new extension flags)', () => {
  it('rejects --vector-storage with --preset simple', () => {
    expect(() => assertAdvancedOnly({ preset: 'simple', vectorStorage: true })).toThrow(
      /--vector-storage is only valid with --preset advanced/,
    );
  });

  it('rejects --shared-model-attrs with --yes (defaults to simple)', () => {
    expect(() => assertAdvancedOnly({ yes: true, sharedModelAttrs: true })).toThrow(
      /--shared-model-attrs is only valid with --preset advanced/,
    );
  });

  it('passes --vector-storage + --shared-model-attrs with --preset advanced', () => {
    expect(() =>
      assertAdvancedOnly({
        preset: 'advanced',
        vectorStorage: true,
        sharedModelAttrs: true,
      }),
    ).not.toThrow();
  });
});

describe('assertTemplateExclusivity (new extension flags)', () => {
  it('rejects --vector-storage combined with --template', () => {
    expect(() =>
      assertTemplateExclusivity({ template: 'bookshelf', vectorStorage: true }),
    ).toThrow(/--vector-storage cannot be combined/);
  });

  it('rejects --shared-model-attrs combined with --offline-template', () => {
    expect(() =>
      assertTemplateExclusivity({ offlineTemplate: '/x', sharedModelAttrs: true }),
    ).toThrow(/--shared-model-attrs cannot be combined/);
  });
});
