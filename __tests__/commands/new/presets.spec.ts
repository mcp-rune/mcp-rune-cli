import { parseModelSpec, presetDefaults, resolveAnswers } from '#src/commands/new/presets.js';

describe('parseModelSpec', () => {
  it('returns empty array for falsy input', () => {
    expect(parseModelSpec()).toEqual([]);
    expect(parseModelSpec('')).toEqual([]);
    expect(parseModelSpec(null)).toEqual([]);
  });

  it('passes through arrays unchanged', () => {
    const arr = [{ name: 'Book', attributes: [] }];
    expect(parseModelSpec(arr)).toBe(arr);
  });

  it('parses a single name', () => {
    const out = parseModelSpec('Book');
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Book');
    expect(out[0].attributes).toHaveLength(2);
    expect(out[0].attributes[0]).toMatchObject({ name: 'name', type: 'string', required: true });
  });

  it('parses comma-separated names and trims whitespace', () => {
    const out = parseModelSpec('Book, Theme , Article');
    expect(out.map((m) => m.name)).toEqual(['Book', 'Theme', 'Article']);
  });

  it('skips empty segments from trailing/leading commas', () => {
    const out = parseModelSpec(',Book,,Theme,');
    expect(out.map((m) => m.name)).toEqual(['Book', 'Theme']);
  });
});

const EXTENSION_DEFAULTS = {
  apiConvention: 'jsonapi',
  apiClient: 'none',
  serverAuth: 'oauth',
  searchAdapter: 'none',
  logger: 'framework',
  errorTracking: 'none',
  tracing: 'none',
  vectorStorage: false,
  sharedModelAttrs: false,
} as const;

const DEFAULT_TOOL_CLASSES = ['strategy', 'data', 'operations'];

describe('presetDefaults', () => {
  it('returns defaults for simple', () => {
    expect(presetDefaults('simple')).toEqual({
      transport: 'stdio',
      toolClasses: DEFAULT_TOOL_CLASSES,
      ...EXTENSION_DEFAULTS,
    });
  });

  it('returns defaults for advanced', () => {
    expect(presetDefaults('advanced')).toEqual({
      transport: 'both',
      toolClasses: DEFAULT_TOOL_CLASSES,
      ...EXTENSION_DEFAULTS,
    });
  });

  it('throws on unknown preset', () => {
    expect(() => presetDefaults('xyz')).toThrow(/unknown preset/);
  });
});

describe('resolveAnswers', () => {
  it('applies simple defaults when nothing is provided', () => {
    const out = resolveAnswers({ projectName: 'foo' });
    expect(out.preset).toBe('simple');
    expect(out.transport).toBe('stdio');
    expect(out.withAnalysis).toBe(false);
    expect(out.models).toEqual([]);
  });

  it('applies advanced defaults', () => {
    const out = resolveAnswers({ projectName: 'foo', preset: 'advanced' });
    expect(out.transport).toBe('both');
  });

  it('lets explicit fields override defaults', () => {
    const out = resolveAnswers({
      projectName: 'foo',
      preset: 'advanced',
      transport: 'stdio',
      withAnalysis: true,
    });
    expect(out.transport).toBe('stdio');
    expect(out.withAnalysis).toBe(true);
  });

  it('parses models from string spec', () => {
    const out = resolveAnswers({ projectName: 'foo', models: 'Book,Theme' });
    expect(out.models.map((m) => m.name)).toEqual(['Book', 'Theme']);
  });

  it('round-trips extension-point overrides', () => {
    const out = resolveAnswers({
      projectName: 'foo',
      preset: 'advanced',
      apiConvention: 'rest-flat',
      apiClient: 'fetch',
      serverAuth: 'static-token',
      searchAdapter: 'ransack',
      logger: 'pino',
      errorTracking: 'sentry',
      tracing: 'langfuse',
    });
    expect(out.apiConvention).toBe('rest-flat');
    expect(out.apiClient).toBe('fetch');
    expect(out.serverAuth).toBe('static-token');
    expect(out.searchAdapter).toBe('ransack');
    expect(out.logger).toBe('pino');
    expect(out.errorTracking).toBe('sentry');
    expect(out.tracing).toBe('langfuse');
  });

  it('keeps extension defaults when not overridden', () => {
    const out = resolveAnswers({ projectName: 'foo', preset: 'advanced' });
    expect(out.apiConvention).toBe('jsonapi');
    expect(out.apiClient).toBe('none');
    expect(out.serverAuth).toBe('oauth');
    expect(out.logger).toBe('framework');
  });

  it('round-trips the new custom extension-point choices', () => {
    const out = resolveAnswers({
      projectName: 'foo',
      preset: 'advanced',
      apiConvention: 'custom',
      apiClient: 'axios',
      searchAdapter: 'custom',
    });
    expect(out.apiConvention).toBe('custom');
    expect(out.apiClient).toBe('axios');
    expect(out.searchAdapter).toBe('custom');
  });

  it('round-trips vectorStorage and sharedModelAttrs', () => {
    const out = resolveAnswers({
      projectName: 'foo',
      preset: 'advanced',
      vectorStorage: true,
      sharedModelAttrs: true,
    });
    expect(out.vectorStorage).toBe(true);
    expect(out.sharedModelAttrs).toBe(true);
  });

  it('defaults vectorStorage and sharedModelAttrs to false', () => {
    const out = resolveAnswers({ projectName: 'foo', preset: 'advanced' });
    expect(out.vectorStorage).toBe(false);
    expect(out.sharedModelAttrs).toBe(false);
  });

  it('promptStrategies defaults to {} and round-trips when set', () => {
    const out = resolveAnswers({ projectName: 'foo', preset: 'advanced' });
    expect(out.promptStrategies).toEqual({});

    const out2 = resolveAnswers({
      projectName: 'foo',
      preset: 'advanced',
      promptStrategies: { Book: 'custom' },
    });
    expect(out2.promptStrategies).toEqual({ Book: 'custom' });
  });

  it('toolClasses defaults match the base set', () => {
    const out = resolveAnswers({ projectName: 'foo', preset: 'advanced' });
    expect(out.toolClasses).toEqual(['strategy', 'data', 'operations']);
  });

  it('withAnalysis=true derives analysis into toolClasses', () => {
    const out = resolveAnswers({
      projectName: 'foo',
      preset: 'advanced',
      withAnalysis: true,
    });
    expect(out.toolClasses).toContain('analysis');
    expect(out.withAnalysis).toBe(true);
  });

  it('withDomain=true derives domain into toolClasses', () => {
    const out = resolveAnswers({
      projectName: 'foo',
      preset: 'advanced',
      withDomain: true,
    });
    expect(out.toolClasses).toContain('domain');
    expect(out.withDomain).toBe(true);
  });

  it('explicit toolClasses sync derived withAnalysis / withDomain', () => {
    const out = resolveAnswers({
      projectName: 'foo',
      preset: 'advanced',
      toolClasses: ['strategy', 'data', 'analysis', 'domain'],
    });
    expect(out.withAnalysis).toBe(true);
    expect(out.withDomain).toBe(true);
    expect(out.toolClasses).toEqual(['strategy', 'data', 'analysis', 'domain']);
  });

  it('withAnalysis=false on top of toolClasses removes analysis', () => {
    const out = resolveAnswers({
      projectName: 'foo',
      preset: 'advanced',
      toolClasses: ['strategy', 'data', 'analysis'],
      withAnalysis: false,
    });
    expect(out.toolClasses).not.toContain('analysis');
    expect(out.withAnalysis).toBe(false);
  });

  it('toolClasses default is not shared across calls (no mutation leak)', () => {
    const a = resolveAnswers({ projectName: 'a', preset: 'advanced', withAnalysis: true });
    const b = resolveAnswers({ projectName: 'b', preset: 'advanced' });
    expect(a.toolClasses).toContain('analysis');
    expect(b.toolClasses).not.toContain('analysis');
  });
});
