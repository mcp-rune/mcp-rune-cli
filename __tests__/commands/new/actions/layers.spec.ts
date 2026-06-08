import { describe, expect, it } from 'vitest';
import { layers } from '#src/commands/new/actions/layers.js';

describe('layers action', () => {
  it('skips when scaffoldMode is template', async () => {
    const ctx = {
      scaffoldMode: 'template' as const,
      preset: undefined,
      vectorStorage: undefined,
      sharedModelAttrs: undefined,
      withAnalysis: undefined,
      toolClasses: undefined,
      yes: false,
    };
    await layers(ctx);
    expect(ctx.vectorStorage).toBeUndefined();
    expect(ctx.sharedModelAttrs).toBeUndefined();
    expect(ctx.withAnalysis).toBeUndefined();
  });

  it('skips when preset is simple', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'simple' as const,
      vectorStorage: undefined,
      sharedModelAttrs: undefined,
      withAnalysis: undefined,
      toolClasses: undefined,
      yes: false,
    };
    await layers(ctx);
    expect(ctx.vectorStorage).toBeUndefined();
  });

  it('skips every layer prompt when --yes', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      vectorStorage: undefined,
      sharedModelAttrs: undefined,
      withAnalysis: undefined,
      toolClasses: undefined,
      yes: true,
    };
    await layers(ctx);
    expect(ctx.vectorStorage).toBeUndefined();
    expect(ctx.sharedModelAttrs).toBeUndefined();
    expect(ctx.withAnalysis).toBeUndefined();
  });

  it('respects flags pre-set on context (no re-prompt)', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      vectorStorage: true,
      sharedModelAttrs: true,
      withAnalysis: false,
      toolClasses: ['strategy', 'data'] as ['strategy', 'data'],
      yes: false,
    };
    await layers(ctx);
    expect(ctx.vectorStorage).toBe(true);
    expect(ctx.sharedModelAttrs).toBe(true);
    expect(ctx.withAnalysis).toBe(false);
    expect(ctx.toolClasses).toEqual(['strategy', 'data']);
  });
});
