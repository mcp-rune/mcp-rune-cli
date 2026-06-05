import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyTemplateOverrides } from '#src/render/fetch-template.js';

describe('applyTemplateOverrides', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rune-overrides-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe('package.json patching', () => {
    it('rewrites name to projectName', async () => {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'bookshelf', dependencies: {} }, null, 2) + '\n',
      );
      await applyTemplateOverrides(dir, { projectName: 'my-server' });
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      expect(pkg.name).toBe('my-server');
    });

    it('preserves 4-space indent', async () => {
      const original = '{\n    "name": "bookshelf",\n    "version": "1.0.0"\n}\n';
      writeFileSync(join(dir, 'package.json'), original);
      await applyTemplateOverrides(dir, { projectName: 'my-server' });
      const out = readFileSync(join(dir, 'package.json'), 'utf8');
      // Every JSON property line should start with exactly 4 spaces.
      const propertyLines = out.split('\n').filter((l) => /^\s+"/.test(l));
      expect(propertyLines.length).toBeGreaterThan(0);
      for (const line of propertyLines) {
        expect(line).toMatch(/^ {4}"/);
      }
    });

    it('preserves tab indent', async () => {
      const original = '{\n\t"name": "bookshelf"\n}\n';
      writeFileSync(join(dir, 'package.json'), original);
      await applyTemplateOverrides(dir, { projectName: 'my-server' });
      const out = readFileSync(join(dir, 'package.json'), 'utf8');
      expect(out).toContain('\t"name": "my-server"');
    });

    it('rewrites @mcp-rune/mcp-rune dependency when override provided', async () => {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify(
          { name: 'p', dependencies: { '@mcp-rune/mcp-rune': '^0.40.0' } },
          null,
          2,
        ) + '\n',
      );
      await applyTemplateOverrides(dir, {
        projectName: 'p',
        mcpRuneVersionOverride: 'file:/abs/path',
      });
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      expect(pkg.dependencies['@mcp-rune/mcp-rune']).toBe('file:/abs/path');
    });

    it('does not rewrite mcp-rune dependency if the package does not list it', async () => {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'p', dependencies: { other: '^1.0.0' } }, null, 2) + '\n',
      );
      await applyTemplateOverrides(dir, {
        projectName: 'p',
        mcpRuneVersionOverride: 'file:/abs/path',
      });
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      expect(pkg.dependencies).toEqual({ other: '^1.0.0' });
    });

    it('does not touch package.json when nothing needs to change', async () => {
      const original =
        JSON.stringify({ name: 'already-correct', dependencies: {} }, null, 2) + '\n';
      writeFileSync(join(dir, 'package.json'), original);
      await applyTemplateOverrides(dir, { projectName: 'already-correct' });
      expect(readFileSync(join(dir, 'package.json'), 'utf8')).toBe(original);
    });

    it('is a no-op when no package.json is present', async () => {
      await expect(applyTemplateOverrides(dir, { projectName: 'p' })).resolves.toBeUndefined();
    });
  });

  describe('<!-- RUNE:REMOVE --> markers', () => {
    it('strips marked content from README.md', async () => {
      writeFileSync(
        join(dir, 'README.md'),
        [
          '# Template README',
          '',
          '<!-- RUNE:REMOVE:START -->',
          'This block is only useful to template maintainers.',
          '<!-- RUNE:REMOVE:END -->',
          '',
          '## Usage',
        ].join('\n'),
      );
      await applyTemplateOverrides(dir, { projectName: 'p' });
      const out = readFileSync(join(dir, 'README.md'), 'utf8');
      expect(out).not.toContain('only useful to template maintainers');
      expect(out).toContain('## Usage');
    });

    it('strips multiple marker blocks from nested markdown files', async () => {
      mkdirSync(join(dir, 'docs'));
      writeFileSync(
        join(dir, 'docs/guide.md'),
        '<!-- RUNE:REMOVE:START -->dev<!-- RUNE:REMOVE:END -->\nA\n<!-- RUNE:REMOVE:START -->\nmore\n<!-- RUNE:REMOVE:END -->\nB\n',
      );
      await applyTemplateOverrides(dir, { projectName: 'p' });
      const out = readFileSync(join(dir, 'docs/guide.md'), 'utf8');
      expect(out).not.toMatch(/dev|more/);
      expect(out).toContain('A');
      expect(out).toContain('B');
    });

    it('skips node_modules and .git when walking', async () => {
      mkdirSync(join(dir, 'node_modules'), { recursive: true });
      writeFileSync(
        join(dir, 'node_modules/example.md'),
        '<!-- RUNE:REMOVE:START -->x<!-- RUNE:REMOVE:END -->keep\n',
      );
      await applyTemplateOverrides(dir, { projectName: 'p' });
      const out = readFileSync(join(dir, 'node_modules/example.md'), 'utf8');
      expect(out).toContain('<!-- RUNE:REMOVE:START -->'); // untouched
    });

    it('does not touch non-markdown files', async () => {
      writeFileSync(
        join(dir, 'config.js'),
        '/* <!-- RUNE:REMOVE:START --> kept <!-- RUNE:REMOVE:END --> */\n',
      );
      await applyTemplateOverrides(dir, { projectName: 'p' });
      const out = readFileSync(join(dir, 'config.js'), 'utf8');
      expect(out).toContain('RUNE:REMOVE');
    });
  });

  describe('boilerplate removal', () => {
    it('removes CHANGELOG.md', async () => {
      writeFileSync(join(dir, 'CHANGELOG.md'), '# Changelog\n');
      await applyTemplateOverrides(dir, { projectName: 'p' });
      expect(existsSync(join(dir, 'CHANGELOG.md'))).toBe(false);
    });

    it('removes .codesandbox directory recursively', async () => {
      mkdirSync(join(dir, '.codesandbox'));
      writeFileSync(join(dir, '.codesandbox/Dockerfile'), 'FROM node\n');
      await applyTemplateOverrides(dir, { projectName: 'p' });
      expect(existsSync(join(dir, '.codesandbox'))).toBe(false);
    });

    it('is a no-op when boilerplate files are absent', async () => {
      await expect(applyTemplateOverrides(dir, { projectName: 'p' })).resolves.toBeUndefined();
    });
  });
});
