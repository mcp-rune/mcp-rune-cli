import { describe, expect, it } from 'vitest';
import { pickMascot } from '../../src/data/mascot.js';

describe('pickMascot', () => {
  it('returns the four expected fields', () => {
    const m = pickMascot({ seed: 0 });
    expect(typeof m.welcome).toBe('string');
    expect(typeof m.signoff).toBe('string');
    expect(typeof m.charm).toBe('string');
    expect(typeof m.sigil).toBe('string');
    expect(m.welcome.length).toBeGreaterThan(0);
  });

  it('is deterministic with a fixed seed', () => {
    const a = pickMascot({ seed: 7, now: new Date('2026-06-05T00:00:00Z') });
    const b = pickMascot({ seed: 7, now: new Date('2026-06-05T00:00:00Z') });
    expect(a).toEqual(b);
  });

  it('produces winter-themed lines for December', () => {
    const m = pickMascot({ seed: 0, now: new Date('2026-12-15T00:00:00Z') });
    expect(['❄', '✻', '✺']).toContain(m.charm);
  });

  it('produces launch-week lines in the first week of November', () => {
    const m = pickMascot({ seed: 0, now: new Date('2026-11-03T00:00:00Z') });
    expect(['✺', '✷', '✸']).toContain(m.charm);
  });
});
