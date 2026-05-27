import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { substitute, pascal, renderTemplate } from '#src/render/copy-tree.js';
import { resolveAnswers } from '#src/wizard/presets.js';
import type { Answers } from '#src/types.js';

function answers(overrides: Partial<Parameters<typeof resolveAnswers>[0]> = {}): Answers {
  return resolveAnswers({ projectName: 'p', ...overrides });
}

describe('substitute', () => {
  it('replaces a single variable', () => {
    expect(substitute('hello {{name}}', { name: 'world' })).toBe('hello world');
  });

  it('replaces repeated variables', () => {
    expect(substitute('{{x}}-{{x}}', { x: 'a' })).toBe('a-a');
  });

  it('handles whitespace inside braces', () => {
    expect(substitute('{{ name }}', { name: 'ok' })).toBe('ok');
  });

  it('throws on unknown variable', () => {
    expect(() => substitute('{{missing}}', {})).toThrow(/unknown template variable/);
  });

  it('coerces non-string values to string', () => {
    expect(substitute('count: {{n}}', { n: 42 })).toBe('count: 42');
    expect(substitute('flag: {{b}}', { b: true })).toBe('flag: true');
  });

  it('passes through text without placeholders', () => {
    expect(substitute('plain text', {})).toBe('plain text');
  });
});

describe('pascal', () => {
  it('capitalizes single word', () => {
    expect(pascal('book')).toBe('Book');
  });

  it('handles kebab-case', () => {
    expect(pascal('study-session')).toBe('StudySession');
  });

  it('handles snake_case', () => {
    expect(pascal('my_mcp_server')).toBe('MyMcpServer');
  });

  it('handles space-separated', () => {
    expect(pascal('hello world')).toBe('HelloWorld');
  });

  it('preserves already-PascalCase input', () => {
    expect(pascal('Book')).toBe('Book');
  });

  it('handles mixed separators', () => {
    expect(pascal('foo-bar_baz')).toBe('FooBarBaz');
  });
});

describe('renderTemplate', () => {
  let tmpRoot: string;
  let templateDir: string;
  let outDir: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'rune-render-'));
    templateDir = join(tmpRoot, 'template');
    outDir = join(tmpRoot, 'out');
    mkdirSync(templateDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('copies a plain file with var substitution', async () => {
    writeFileSync(join(templateDir, 'README.md'), '# {{projectName}}\n');
    await renderTemplate(templateDir, outDir, answers({ projectName: 'foo' }));
    expect(readFileSync(join(outDir, 'README.md'), 'utf8')).toBe('# foo\n');
  });

  it('renders .ejs files and strips the extension', async () => {
    writeFileSync(join(templateDir, 'config.js.ejs'), 'export const name = "<%= projectName %>";');
    await renderTemplate(templateDir, outDir, answers({ projectName: 'bar' }));
    expect(existsSync(join(outDir, 'config.js.ejs'))).toBe(false);
    expect(readFileSync(join(outDir, 'config.js'), 'utf8')).toContain('"bar"');
  });

  it('does not HTML-escape interpolations (used for source code)', async () => {
    writeFileSync(join(templateDir, 'pkg.json.ejs'), '{"engines": ">=24"}');
    await renderTemplate(templateDir, outDir, answers());
    expect(readFileSync(join(outDir, 'pkg.json'), 'utf8')).toContain('>=24');
  });

  it('skips __only_if_<flag>__ subtrees when the flag is falsy', async () => {
    const condDir = join(templateDir, '__only_if_withAnalysis__');
    mkdirSync(condDir);
    writeFileSync(join(condDir, 'docker-compose.yml'), 'services: {}');
    writeFileSync(join(templateDir, 'always.txt'), 'present');

    await renderTemplate(templateDir, outDir, answers({ preset: 'advanced', withAnalysis: false }));
    expect(existsSync(join(outDir, 'docker-compose.yml'))).toBe(false);
    expect(existsSync(join(outDir, 'always.txt'))).toBe(true);
  });

  it('includes __only_if_<flag>__ subtree contents when flag is truthy', async () => {
    const condDir = join(templateDir, '__only_if_withAnalysis__');
    mkdirSync(condDir);
    writeFileSync(join(condDir, 'docker-compose.yml'), 'services: {}');

    await renderTemplate(templateDir, outDir, answers({ preset: 'advanced', withAnalysis: true }));
    expect(existsSync(join(outDir, 'docker-compose.yml'))).toBe(true);
  });

  it('expands _model_ filenames once per model', async () => {
    mkdirSync(join(templateDir, 'src', 'models'), { recursive: true });
    writeFileSync(
      join(templateDir, 'src', 'models', '_model_.js.ejs'),
      'export class <%= model.namePascal %> {}',
    );

    await renderTemplate(templateDir, outDir, answers({ models: 'Book,Theme' }));

    expect(readFileSync(join(outDir, 'src/models/book.js'), 'utf8')).toContain('class Book');
    expect(readFileSync(join(outDir, 'src/models/theme.js'), 'utf8')).toContain('class Theme');
  });

  it('throws on conditional directory referencing an unknown var', async () => {
    const condDir = join(templateDir, '__only_if_doesNotExist__');
    mkdirSync(condDir);
    writeFileSync(join(condDir, 'x.txt'), 'x');

    await expect(renderTemplate(templateDir, outDir, answers())).rejects.toThrow(/unknown var/);
  });
});
