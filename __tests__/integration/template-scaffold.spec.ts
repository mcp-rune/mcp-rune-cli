import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  copyOfflineTemplate,
  applyTemplateOverrides,
  fetchTemplate,
} from '#src/render/fetch-template.js';
import { resolveTemplate, templateToTigedSource } from '#src/templates/registry.js';

const FIXTURE_DIR = fileURLToPath(
  new URL('../fixtures/templates/bookshelf-mini/', import.meta.url),
);

describe('resolveTemplate', () => {
  it('resolves registered template IDs from the registry', () => {
    const r = resolveTemplate('bookshelf');
    expect(r.source).toBe('registry');
    expect(r.spec.repo).toBe('mcp-rune/examples');
    expect(r.spec.subdir).toBe('bookshelf');
  });

  it('parses user/repo[/subdir][#ref] shorthand', () => {
    const r = resolveTemplate('foo/bar/baz#dev');
    expect(r.source).toBe('shorthand');
    expect(r.spec).toEqual({ repo: 'foo/bar', subdir: 'baz', ref: 'dev' });
  });

  it('parses user/repo without subdir or ref', () => {
    const r = resolveTemplate('foo/bar');
    expect(r.source).toBe('shorthand');
    expect(r.spec).toEqual({ repo: 'foo/bar', subdir: undefined, ref: undefined });
  });

  it('throws on unrecognized id', () => {
    expect(() => resolveTemplate('not-a-template')).toThrow(/Unknown template/);
  });
});

describe('templateToTigedSource', () => {
  it('builds a tiged shorthand from a registry spec', () => {
    const r = resolveTemplate('bookshelf');
    expect(templateToTigedSource(r.spec)).toBe('mcp-rune/examples/bookshelf#main');
  });

  it('omits subdir and ref when absent', () => {
    expect(templateToTigedSource({ repo: 'foo/bar' })).toBe('foo/bar');
  });
});

describe('copyOfflineTemplate', () => {
  let outDir: string;
  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it('copies every fixture file verbatim into the target', async () => {
    outDir = mkdtempSync(join(tmpdir(), 'rune-tpl-'));
    await copyOfflineTemplate(FIXTURE_DIR, outDir);

    expect(existsSync(join(outDir, 'package.json'))).toBe(true);
    expect(existsSync(join(outDir, 'README.md'))).toBe(true);
    expect(existsSync(join(outDir, '.npmrc'))).toBe(true);

    const pkg = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('bookshelf-mini');
    expect(pkg.dependencies['@mcp-rune/mcp-rune']).toBe('^0.73.2');
  });

  it('throws when the source directory does not exist', async () => {
    outDir = mkdtempSync(join(tmpdir(), 'rune-tpl-'));
    await expect(copyOfflineTemplate('/nope/does/not/exist', outDir)).rejects.toThrow(
      /does not exist/,
    );
  });
});

describe('applyTemplateOverrides', () => {
  let outDir: string;
  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it('rewrites @mcp-rune/mcp-rune in package.json when a version override is provided', async () => {
    outDir = mkdtempSync(join(tmpdir(), 'rune-tpl-'));
    await copyOfflineTemplate(FIXTURE_DIR, outDir);
    await applyTemplateOverrides(outDir, { mcpRuneVersionOverride: 'file:/abs/path' });

    const pkg = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@mcp-rune/mcp-rune']).toBe('file:/abs/path');
  });

  it('leaves package.json untouched when no override is provided', async () => {
    outDir = mkdtempSync(join(tmpdir(), 'rune-tpl-'));
    await copyOfflineTemplate(FIXTURE_DIR, outDir);
    const before = readFileSync(join(outDir, 'package.json'), 'utf8');
    await applyTemplateOverrides(outDir, {});
    const after = readFileSync(join(outDir, 'package.json'), 'utf8');
    expect(after).toBe(before);
  });
});

describe.skipIf(process.env.MCPR_E2E !== '1')('fetchTemplate (network)', () => {
  let outDir: string;
  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it('clones the bookshelf template from the real repo via tiged', async () => {
    outDir = mkdtempSync(join(tmpdir(), 'rune-tpl-e2e-'));
    await fetchTemplate('bookshelf', outDir);
    expect(existsSync(join(outDir, 'package.json'))).toBe(true);
    expect(existsSync(join(outDir, 'README.md'))).toBe(true);
  }, 30000);
});
