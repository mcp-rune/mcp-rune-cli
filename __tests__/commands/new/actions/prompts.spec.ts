import { describe, expect, it } from 'vitest';
import { prompts } from '#src/commands/new/actions/prompts.js';

describe('prompts action', () => {
  it('skips when scaffoldMode is template', async () => {
    const ctx = {
      scaffoldMode: 'template' as const,
      preset: undefined,
      modelsRaw: 'Book',
      promptStrategies: undefined,
      yes: false,
    };
    await prompts(ctx);
    expect(ctx.promptStrategies).toBeUndefined();
  });

  it('skips when preset is simple', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'simple' as const,
      modelsRaw: 'Book',
      promptStrategies: undefined,
      yes: false,
    };
    await prompts(ctx);
    expect(ctx.promptStrategies).toBeUndefined();
  });

  it('skips when --yes', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      modelsRaw: 'Book',
      promptStrategies: undefined,
      yes: true,
    };
    await prompts(ctx);
    expect(ctx.promptStrategies).toBeUndefined();
  });

  it('skips when no models declared (nothing to ask)', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      modelsRaw: '',
      promptStrategies: undefined,
      yes: false,
    };
    await prompts(ctx);
    expect(ctx.promptStrategies).toBeUndefined();
  });

  it('respects promptStrategies pre-set on context (no re-prompt)', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      modelsRaw: 'Book',
      promptStrategies: { Book: 'custom' as const },
      yes: false,
    };
    await prompts(ctx);
    expect(ctx.promptStrategies).toEqual({ Book: 'custom' });
  });
});
