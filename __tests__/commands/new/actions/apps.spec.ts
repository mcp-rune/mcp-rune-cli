import { describe, expect, it } from 'vitest';
import { apps } from '#src/commands/new/actions/apps.js';

describe('apps action', () => {
  it('skips when scaffoldMode is template', async () => {
    const ctx = {
      scaffoldMode: 'template' as const,
      preset: undefined,
      apiConvention: undefined,
      apiClient: undefined,
      searchAdapter: undefined,
      yes: false,
    };
    await apps(ctx);
    expect(ctx.apiConvention).toBeUndefined();
    expect(ctx.apiClient).toBeUndefined();
    expect(ctx.searchAdapter).toBeUndefined();
  });

  it('skips when preset is simple', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'simple' as const,
      apiConvention: undefined,
      apiClient: undefined,
      searchAdapter: undefined,
      yes: false,
    };
    await apps(ctx);
    expect(ctx.apiConvention).toBeUndefined();
  });

  it('skips every prompt when --yes', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      apiConvention: undefined,
      apiClient: undefined,
      searchAdapter: undefined,
      yes: true,
    };
    await apps(ctx);
    expect(ctx.apiConvention).toBeUndefined();
    expect(ctx.apiClient).toBeUndefined();
    expect(ctx.searchAdapter).toBeUndefined();
  });

  it('preserves values set by flags (custom convention/client/search pass through)', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      apiConvention: 'custom' as const,
      apiClient: 'axios' as const,
      searchAdapter: 'custom' as const,
      yes: false,
    };
    await apps(ctx);
    expect(ctx.apiConvention).toBe('custom');
    expect(ctx.apiClient).toBe('axios');
    expect(ctx.searchAdapter).toBe('custom');
  });
});
