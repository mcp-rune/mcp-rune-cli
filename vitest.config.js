import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '#src': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.spec.{js,ts}'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: [
        '**/__tests__/**',
        'vitest.config.js',
        'bin/**',
        'scripts/**',
        'src/commands/new/actions/post-scaffold.js',
        'src/commands/db-up.js',
      ],
    },
  },
});
