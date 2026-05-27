import { parseModelSpec, presetDefaults, resolveAnswers } from '#src/wizard/presets.js';

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

describe('presetDefaults', () => {
  it('returns defaults for simple', () => {
    expect(presetDefaults('simple')).toEqual({
      transport: 'stdio',
      withAnalysis: false,
      withDomain: false,
    });
  });

  it('returns defaults for advanced', () => {
    expect(presetDefaults('advanced')).toEqual({
      transport: 'both',
      withAnalysis: false,
      withDomain: false,
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
});
