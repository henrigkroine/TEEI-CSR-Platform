import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['pact-tests/**/*.pact.test.ts'],
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'pacts/**',
        'logs/**',
        '*.config.ts',
      ],
    },
  },
});
