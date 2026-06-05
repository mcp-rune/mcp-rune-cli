import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('scaffold smoke', () => {
  it('package.json declares the design-mandated scripts', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    for (const name of ['start', 'start:local', 'test', 'typecheck', 'inspect']) {
      expect(pkg.scripts[name], `missing script: ${name}`).toBeTypeOf('string');
    }
  });
});
