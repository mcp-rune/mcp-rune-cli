import { describe, expect, it } from 'vitest';
import { preset } from '#src/commands/new/actions/preset.js';

describe('preset action', () => {
  it('skips when scaffoldMode is template', async () => {
    const ctx = { scaffoldMode: 'template' as const, preset: undefined, yes: false };
    await preset(ctx);
    expect(ctx.preset).toBeUndefined();
  });

  it('skips when preset is already set (flag-provided)', async () => {
    const ctx = { scaffoldMode: 'preset' as const, preset: 'advanced' as const, yes: false };
    await preset(ctx);
    expect(ctx.preset).toBe('advanced');
  });

  it('sets preset=simple when --yes and preset undefined', async () => {
    const ctx = { scaffoldMode: 'preset' as const, preset: undefined, yes: true };
    await preset(ctx);
    expect(ctx.preset).toBe('simple');
  });
});
