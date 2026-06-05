import { describe, expect, it } from 'vitest';
import {
  accent,
  brand,
  chip,
  fail,
  link,
  muted,
  pc,
  strong,
  success,
  warn,
} from '../../src/core/color.js';

describe('color tokens', () => {
  it('all semantic tokens are callable and preserve text content', () => {
    for (const fn of [brand, accent, muted, success, warn, fail, strong, link]) {
      const out = fn('x');
      expect(typeof out).toBe('string');
      expect(out).toContain('x');
    }
  });

  it('chip wraps a label with leading and trailing space', () => {
    expect(chip('rune')).toContain(' rune ');
  });

  it('re-exports picocolors as pc', () => {
    expect(typeof pc.red).toBe('function');
    expect(typeof pc.isColorSupported).toBe('boolean');
  });
});
