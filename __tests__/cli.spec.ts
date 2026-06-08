import { describe, expect, it } from 'vitest';
import { buildProgram } from '#src/index.js';

function findCommand(name: string) {
  const program = buildProgram();
  const cmd = program.commands.find((c) => c.name() === name);
  if (!cmd) throw new Error(`command not found: ${name}`);
  return cmd;
}

describe('rune CLI flag registration', () => {
  it('exposes the expected top-level commands', () => {
    const program = buildProgram();
    const names = program.commands.map((c) => c.name()).sort();
    expect(names).toEqual(['add', 'db', 'doctor', 'inspect', 'new'].sort());
  });

  describe('`rune new`', () => {
    it('registers all advanced extension flags including the new ones', () => {
      const cmd = findCommand('new');
      const flags = cmd.options.map((o) => o.long);
      for (const expected of [
        '--preset',
        '--template',
        '--offline-template',
        '--yes',
        '--with-analysis',
        '--with-domain',
        '--transport',
        '--models',
        '--api-convention',
        '--api-client',
        '--server-auth',
        '--search-adapter',
        '--logger',
        '--error-tracking',
        '--tracing',
        '--vector-storage',
        '--shared-model-attrs',
        '--mcp-rune-local',
      ]) {
        expect(flags).toContain(expected);
      }
    });

    it('parses --vector-storage and --shared-model-attrs as booleans', () => {
      const cmd = findCommand('new');
      cmd.exitOverride();
      cmd.action(() => {});
      cmd.parse(['proj', '--vector-storage', '--shared-model-attrs'], { from: 'user' });
      const opts = cmd.opts();
      expect(opts.vectorStorage).toBe(true);
      expect(opts.sharedModelAttrs).toBe(true);
    });

    it('parses extended --api-* / --search-adapter values (including the new custom/axios choices)', () => {
      const cmd = findCommand('new');
      cmd.exitOverride();
      cmd.action(() => {});
      cmd.parse(
        [
          'proj',
          '--preset',
          'advanced',
          '--api-convention',
          'custom',
          '--api-client',
          'axios',
          '--search-adapter',
          'custom',
        ],
        { from: 'user' },
      );
      const opts = cmd.opts();
      expect(opts.preset).toBe('advanced');
      expect(opts.apiConvention).toBe('custom');
      expect(opts.apiClient).toBe('axios');
      expect(opts.searchAdapter).toBe('custom');
    });

    it('--no-install / --no-git invert install/git defaults', () => {
      const cmd = findCommand('new');
      cmd.exitOverride();
      cmd.action(() => {});
      cmd.parse(['proj', '--no-install', '--no-git'], { from: 'user' });
      const opts = cmd.opts();
      expect(opts.install).toBe(false);
      expect(opts.git).toBe(false);
    });

    it('help output describes the new flags', () => {
      const cmd = findCommand('new');
      const help = cmd.helpInformation();
      expect(help).toContain('--vector-storage');
      expect(help).toContain('--shared-model-attrs');
      // Updated help strings for existing flags should mention the new choices.
      expect(help).toMatch(/--api-convention[\s\S]*custom/);
      expect(help).toMatch(/--api-client[\s\S]*axios/);
      expect(help).toMatch(/--api-client[\s\S]*custom/);
      expect(help).toMatch(/--search-adapter[\s\S]*custom/);
    });
  });
});
