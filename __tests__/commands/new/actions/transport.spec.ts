import { describe, expect, it } from 'vitest';
import { transport } from '#src/commands/new/actions/transport.js';

describe('transport action', () => {
  it('skips when scaffoldMode is template', async () => {
    const ctx = {
      scaffoldMode: 'template' as const,
      preset: undefined,
      transport: undefined,
      yes: false,
    };
    await transport(ctx);
    expect(ctx.transport).toBeUndefined();
  });

  it('skips when preset is simple (no transport prompt)', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'simple' as const,
      transport: undefined,
      yes: false,
    };
    await transport(ctx);
    expect(ctx.transport).toBeUndefined();
  });

  it('skips when transport already set by flag', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      transport: 'http' as const,
      yes: false,
    };
    await transport(ctx);
    expect(ctx.transport).toBe('http');
  });

  it('skips when --yes (default applied by resolveAnswers)', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      transport: undefined,
      yes: true,
    };
    await transport(ctx);
    expect(ctx.transport).toBeUndefined();
  });
});
