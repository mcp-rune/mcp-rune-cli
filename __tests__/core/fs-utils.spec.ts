import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isEmpty, toValidName, validatePackageName } from '../../src/core/fs-utils.js';

describe('isEmpty', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rune-fsutils-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns true for a non-existent path', () => {
    expect(isEmpty(join(dir, 'nope'))).toBe(true);
  });

  it('returns true for an empty directory', () => {
    expect(isEmpty(dir)).toBe(true);
  });

  it('returns false for a non-empty directory', () => {
    writeFileSync(join(dir, 'a.txt'), 'x');
    expect(isEmpty(dir)).toBe(false);
  });

  it('returns false for a path that is a file', () => {
    const file = join(dir, 'a.txt');
    writeFileSync(file, 'x');
    expect(isEmpty(file)).toBe(false);
  });

  it('returns true for an empty nested directory', () => {
    const nested = join(dir, 'sub');
    mkdirSync(nested);
    expect(isEmpty(nested)).toBe(true);
  });
});

describe('validatePackageName', () => {
  it.each([
    ['my-server', undefined],
    ['my-server-2', undefined],
    ['@scope/name', undefined],
    ['a', undefined],
  ])('accepts %s', (name, expected) => {
    expect(validatePackageName(name)).toBe(expected);
  });

  it('rejects empty', () => {
    expect(validatePackageName('')).toMatch(/empty/i);
  });

  it('rejects whitespace-only', () => {
    expect(validatePackageName('   ')).toBeDefined();
  });

  it('rejects uppercase', () => {
    expect(validatePackageName('MyServer')).toBeDefined();
  });

  it('rejects leading dot', () => {
    expect(validatePackageName('.hidden')).toBeDefined();
  });

  it('rejects spaces inside', () => {
    expect(validatePackageName('my server')).toBeDefined();
  });

  it('rejects names over 214 chars', () => {
    expect(validatePackageName('a'.repeat(215))).toMatch(/214/);
  });
});

describe('toValidName', () => {
  it('lowercases', () => {
    expect(toValidName('MyServer')).toBe('myserver');
  });

  it('replaces spaces with dashes', () => {
    expect(toValidName('my server')).toBe('my-server');
  });

  it('collapses multiple dashes', () => {
    expect(toValidName('my---server')).toBe('my-server');
  });

  it('strips leading and trailing non-alpha', () => {
    expect(toValidName('-_my-name_-')).toBe('my-name');
  });

  it('preserves scope and slash', () => {
    expect(toValidName('@Scope/MyName')).toBe('@scope/myname');
  });
});
