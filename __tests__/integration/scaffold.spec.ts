import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderTemplate } from '#src/render/copy-tree.js';
import { resolveAnswers } from '#src/wizard/presets.js';
import type { Answers } from '#src/types.js';

const REPO_ROOT = new URL('../..', import.meta.url);

function answers(overrides: Partial<Parameters<typeof resolveAnswers>[0]>): Answers {
  return resolveAnswers({ projectName: 'test-app', ...overrides });
}

function scaffold(preset: 'simple' | 'advanced', input: Partial<Parameters<typeof resolveAnswers>[0]> = {}) {
  const outDir = mkdtempSync(join(tmpdir(), `rune-${preset}-`));
  const templateUrl = new URL(`templates/${preset}/`, REPO_ROOT);
  return { outDir, templateUrl, ans: answers({ preset, ...input }) };
}

describe('simple preset', () => {
  let outDir: string;

  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it('renders the minimal file set', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('simple');
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'package.json'))).toBe(true);
    expect(existsSync(join(outDir, 'src/server.js'))).toBe(true);
    expect(existsSync(join(outDir, 'src/config.js'))).toBe(true);
    expect(existsSync(join(outDir, '.npmrc'))).toBe(true);
    expect(existsSync(join(outDir, '.env.example'))).toBe(true);
  });

  it('writes a valid package.json with the project name and mcp-rune dep', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('simple', { projectName: 'demo-srv' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    const pkg = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('demo-srv');
    expect(pkg.dependencies['@mcp-rune/mcp-rune']).toMatch(/\^/);
    expect(pkg.engines.node).toContain('>=');
  });

  it('does not emit conditional advanced-only files', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('simple');
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'docker-compose.yml'))).toBe(false);
    expect(existsSync(join(outDir, 'src/servers'))).toBe(false);
    expect(existsSync(join(outDir, 'src/domain'))).toBe(false);
  });

  it('generates one file per declared model + an aggregating index', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('simple', { models: 'Book,Theme' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/models/book.js'))).toBe(true);
    expect(existsSync(join(outDir, 'src/models/theme.js'))).toBe(true);
    expect(existsSync(join(outDir, 'src/prompts/book-prompt.js'))).toBe(true);
    expect(existsSync(join(outDir, 'src/prompts/theme-prompt.js'))).toBe(true);

    const index = readFileSync(join(outDir, 'src/models/index.js'), 'utf8');
    expect(index).toContain("import { Book } from './book.js'");
    expect(index).toContain("import { Theme } from './theme.js'");
    expect(index).toContain('MODEL_CLASSES');
  });
});

describe('advanced preset', () => {
  let outDir: string;

  afterEach(() => {
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  it('renders both transport entrypoints by default', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced');
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/servers/local.js'))).toBe(true);
    expect(existsSync(join(outDir, 'src/servers/remote.js'))).toBe(true);
    expect(existsSync(join(outDir, 'src/profiles.js'))).toBe(true);
    expect(existsSync(join(outDir, 'src/db.js'))).toBe(true);
    expect(existsSync(join(outDir, 'config/schema.js'))).toBe(true);
    expect(existsSync(join(outDir, 'src/prompts/registry.js'))).toBe(true);
  });

  it('omits docker-compose and domain dir without their flags', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced');
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'docker-compose.yml'))).toBe(false);
    expect(existsSync(join(outDir, 'src/domain/registry.js'))).toBe(false);
  });

  it('emits docker-compose.yml with --with-analysis', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { withAnalysis: true });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'docker-compose.yml'))).toBe(true);
    const compose = readFileSync(join(outDir, 'docker-compose.yml'), 'utf8');
    expect(compose).toContain('pgvector');
  });

  it('emits src/domain/registry.js with --with-domain', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { withDomain: true });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/domain/registry.js'))).toBe(true);
  });

  it('writes a config schema including OAuth when transport has http', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { transport: 'both' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    const schema = readFileSync(join(outDir, 'config/schema.js'), 'utf8');
    expect(schema).toContain('oauth');
    expect(schema).toContain('OAUTH_CLIENT_ID');
  });

  it('omits OAuth config when transport is stdio-only', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { transport: 'stdio' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    const schema = readFileSync(join(outDir, 'config/schema.js'), 'utf8');
    expect(schema).not.toContain('OAUTH_CLIENT_ID');
  });
});
