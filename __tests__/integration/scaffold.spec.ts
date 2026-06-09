import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderTemplate } from '#src/render/copy-tree.js';
import { resolveAnswers } from '#src/commands/new/presets.js';
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
    expect(existsSync(join(outDir, 'src/server.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'src/config.ts'))).toBe(true);
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

    expect(existsSync(join(outDir, 'src/models/book.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'src/models/theme.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'src/prompts/book-prompt.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'src/prompts/theme-prompt.ts'))).toBe(true);

    const index = readFileSync(join(outDir, 'src/models/index.ts'), 'utf8');
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

    expect(existsSync(join(outDir, 'src/servers/local.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'src/servers/remote.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'src/profiles.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'src/db.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'config/schema.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'src/prompts/index.ts'))).toBe(true);
  });

  it('omits docker-compose and domain dir without their flags', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced');
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'docker-compose.yml'))).toBe(false);
    expect(existsSync(join(outDir, 'src/domain/registry.ts'))).toBe(false);
  });

  it('emits docker-compose.yml with --with-analysis', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { withAnalysis: true });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'docker-compose.yml'))).toBe(true);
    const compose = readFileSync(join(outDir, 'docker-compose.yml'), 'utf8');
    expect(compose).toContain('pgvector');
  });

  it('emits src/domain/registry.ts with --with-domain', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { withDomain: true });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/domain/registry.ts'))).toBe(true);
    const registry = readFileSync(join(outDir, 'src/domain/registry.ts'), 'utf8');
    // Must use the new adapter-based API
    expect(registry).toContain('InMemoryDomainAdapter');
    expect(registry).toContain('DomainModule');
    expect(registry).toContain('DomainRegistry');
    // Must NOT use the old constructor shape
    expect(registry).not.toContain('DomainKnowledge');
    expect(registry).not.toContain('new RuleSet');
    expect(registry).not.toContain('WorkflowRegistry');
    expect(registry).not.toContain('knowledge:');
  });

  it('writes a config schema including OAuth when transport has http', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { transport: 'both' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    const schema = readFileSync(join(outDir, 'config/schema.ts'), 'utf8');
    expect(schema).toContain('oauth');
    expect(schema).toContain('OAUTH_CLIENT_ID');
  });

  it('omits OAuth config when transport is stdio-only', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { transport: 'stdio' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    const schema = readFileSync(join(outDir, 'config/schema.ts'), 'utf8');
    expect(schema).not.toContain('OAUTH_CLIENT_ID');
  });

  it('emits flat-rest convention file when --api-convention=rest-flat', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', {
      apiConvention: 'rest-flat',
    });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/conventions/flat-rest-convention.ts'))).toBe(true);
    const tools = readFileSync(join(outDir, 'src/tools/index.ts'), 'utf8');
    expect(tools).toContain("from '../conventions/flat-rest-convention.js'");
  });

  it('emits fetch client and wires it in when --api-client=fetch', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { apiClient: 'fetch' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/api/fetch-client.ts'))).toBe(true);
    const tools = readFileSync(join(outDir, 'src/tools/index.ts'), 'utf8');
    expect(tools).toContain('new FetchApiClient');
    expect(tools).not.toContain('inject your API client here');
  });

  it('swaps oauth for accessToken when --server-auth=static-token', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', {
      serverAuth: 'static-token',
      transport: 'http',
    });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    const remote = readFileSync(join(outDir, 'src/servers/remote.ts'), 'utf8');
    expect(remote).toContain('accessToken: config.transport.remote.accessToken');
    expect(remote).not.toContain('createOAuthService');

    const schema = readFileSync(join(outDir, 'config/schema.ts'), 'utf8');
    expect(schema).not.toContain('OAUTH_CLIENT_ID');
    expect(schema).toContain('HTTP_ACCESS_TOKEN');
  });

  it('emits ransack search adapter when --search-adapter=ransack', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', {
      searchAdapter: 'ransack',
    });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/api-extensions/ransack-search-adapter.ts'))).toBe(true);
    const tools = readFileSync(join(outDir, 'src/tools/index.ts'), 'utf8');
    expect(tools).toContain('ransackSearchAdapter');
  });

  it('emits pino logger and updates imports when --logger=pino', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { logger: 'pino' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/observability/logger.ts'))).toBe(true);
    const cfg = readFileSync(join(outDir, 'src/config.ts'), 'utf8');
    expect(cfg).toContain("from './observability/logger.js'");

    const pkg = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf8'));
    expect(pkg.dependencies.pino).toBeTruthy();
  });

  it('uncomments SENTRY_DSN in .env.example when --error-tracking=sentry', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', {
      errorTracking: 'sentry',
    });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    const env = readFileSync(join(outDir, '.env.example'), 'utf8');
    expect(env).toMatch(/^SENTRY_DSN=/m);
  });

  it('uncomments LANGFUSE keys in .env.example when --tracing=langfuse', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { tracing: 'langfuse' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    const env = readFileSync(join(outDir, '.env.example'), 'utf8');
    expect(env).toMatch(/^LANGFUSE_PUBLIC_KEY=/m);
    expect(env).toMatch(/^LANGFUSE_SECRET_KEY=/m);
  });

  it('keeps observability keys commented out by default', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced');
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    const env = readFileSync(join(outDir, '.env.example'), 'utf8');
    expect(env).toMatch(/^# SENTRY_DSN=/m);
    expect(env).toMatch(/^# LANGFUSE_PUBLIC_KEY=/m);
  });

  it('emits custom-convention stub and wires it when --api-convention=custom', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', {
      apiConvention: 'custom',
      apiClient: 'fetch',
    });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/conventions/custom-convention.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'src/conventions/flat-rest-convention.ts'))).toBe(false);
    const tools = readFileSync(join(outDir, 'src/tools/index.ts'), 'utf8');
    expect(tools).toContain("from '../conventions/custom-convention.js'");
    expect(tools).toContain('convention: customConvention');
  });

  it('emits axios client + axios dep when --api-client=axios', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { apiClient: 'axios' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/api/axios-client.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'src/api/fetch-client.ts'))).toBe(false);
    const tools = readFileSync(join(outDir, 'src/tools/index.ts'), 'utf8');
    expect(tools).toContain('new AxiosApiClient');

    const pkg = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf8'));
    expect(pkg.dependencies.axios).toBeTruthy();
  });

  it('does not add axios to package.json without --api-client=axios', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { apiClient: 'fetch' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    const pkg = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf8'));
    expect(pkg.dependencies.axios).toBeUndefined();
  });

  it('emits custom api client stub and wires it when --api-client=custom', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { apiClient: 'custom' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/api/custom-client.ts'))).toBe(true);
    const tools = readFileSync(join(outDir, 'src/tools/index.ts'), 'utf8');
    expect(tools).toContain('new CustomApiClient');
    expect(tools).not.toContain('inject your API client here');
  });

  it('emits custom search adapter when --search-adapter=custom', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { searchAdapter: 'custom' });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/api-extensions/custom-search-adapter.ts'))).toBe(true);
    expect(existsSync(join(outDir, 'src/api-extensions/ransack-search-adapter.ts'))).toBe(false);
    const tools = readFileSync(join(outDir, 'src/tools/index.ts'), 'utf8');
    expect(tools).toContain("from '../api-extensions/custom-search-adapter.js'");
  });

  it('emits vector storage hook stub when --vector-storage', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { vectorStorage: true });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/storage/vector-store.ts'))).toBe(true);
  });

  it('omits vector storage stub by default', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced');
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/storage/vector-store.ts'))).toBe(false);
  });

  it('emits shared AppBaseModel when --shared-model-attrs', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', { sharedModelAttrs: true });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/models/app-base-model.ts'))).toBe(true);
    const body = readFileSync(join(outDir, 'src/models/app-base-model.ts'), 'utf8');
    expect(body).toContain('class AppBaseModel extends BaseModel');
  });

  it('omits AppBaseModel by default', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced');
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    expect(existsSync(join(outDir, 'src/models/app-base-model.ts'))).toBe(false);
  });

  it('combining custom convention + axios produces wiring that references both', async () => {
    const { outDir: dir, templateUrl, ans } = scaffold('advanced', {
      apiConvention: 'custom',
      apiClient: 'axios',
    });
    outDir = dir;
    await renderTemplate(templateUrl, outDir, ans);

    const tools = readFileSync(join(outDir, 'src/tools/index.ts'), 'utf8');
    expect(tools).toContain('AxiosApiClient');
    expect(tools).toContain('customConvention');
  });
});
