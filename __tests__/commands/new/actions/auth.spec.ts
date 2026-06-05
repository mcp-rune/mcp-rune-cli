import { describe, expect, it } from 'vitest';
import { auth } from '#src/commands/new/actions/auth.js';

describe('auth action', () => {
  it('skips when scaffoldMode is template', async () => {
    const ctx = {
      scaffoldMode: 'template' as const,
      preset: undefined,
      transport: undefined,
      serverAuth: undefined,
      yes: false,
    };
    await auth(ctx);
    expect(ctx.serverAuth).toBeUndefined();
  });

  it('skips when preset is simple', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'simple' as const,
      transport: undefined,
      serverAuth: undefined,
      yes: false,
    };
    await auth(ctx);
    expect(ctx.serverAuth).toBeUndefined();
  });

  it("forces 'oauth' when transport is stdio-only (legacy parity)", async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      transport: 'stdio' as const,
      serverAuth: undefined,
      yes: false,
    };
    await auth(ctx);
    expect(ctx.serverAuth).toBe('oauth');
  });

  it('skips prompt under --yes when transport has http', async () => {
    const ctx = {
      scaffoldMode: 'preset' as const,
      preset: 'advanced' as const,
      transport: 'both' as const,
      serverAuth: undefined,
      yes: true,
    };
    await auth(ctx);
    expect(ctx.serverAuth).toBeUndefined();
  });
});
