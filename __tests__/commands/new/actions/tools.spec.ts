import { describe, expect, it } from 'vitest';
import { tools } from '#src/commands/new/actions/tools.js';

describe('tools action', () => {
  it('skips when scaffoldMode is template', async () => {
    const ctx = {
      scaffoldMode: 'template' as const,
      preset: undefined,
      toolClasses: undefined,
      withAnalysis: undefined,
      withDomain: undefined,
      yes: false,
    };
    await tools(ctx);
    expect(ctx.toolClasses).toBeUndefined();
  });

  it('skips when preset is simple', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'simple' as const,
      toolClasses: undefined,
      withAnalysis: undefined,
      withDomain: undefined,
      yes: false,
    };
    await tools(ctx);
    expect(ctx.toolClasses).toBeUndefined();
  });

  it('skips when --yes (defaults applied later)', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      toolClasses: undefined,
      withAnalysis: undefined,
      withDomain: undefined,
      yes: true,
    };
    await tools(ctx);
    expect(ctx.toolClasses).toBeUndefined();
  });

  it('skips when toolClasses already set by flag', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      toolClasses: ['strategy', 'data', 'analysis'] as ['strategy', 'data', 'analysis'],
      withAnalysis: undefined,
      withDomain: undefined,
      yes: false,
    };
    await tools(ctx);
    expect(ctx.toolClasses).toEqual(['strategy', 'data', 'analysis']);
  });
});
