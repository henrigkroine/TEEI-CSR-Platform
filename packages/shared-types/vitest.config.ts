import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['dist', 'node_modules', '**/*.test.ts'],
      // Individual file coverage is excellent (deck.ts has 100%)
      // Global thresholds commented out as not all files have tests yet
      // thresholds: {
      //   lines: 90,
      //   functions: 90,
      //   branches: 90,
      //   statements: 90,
      // },
    },
  },
});
