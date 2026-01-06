import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts',
        '**/*.config.ts',
        'scripts/**'
      ],
      // Production-level coverage thresholds (80%)
      // These are strictly enforced in CI via quality-gates.yml
      // DO NOT lower these thresholds without team approval
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        autoUpdate: false // Prevent automatic threshold updates
      },
      // Enable all coverage checks
      all: true,
      // Include source files for coverage
      include: [
        'packages/*/src/**/*.{ts,tsx}',
        'services/*/src/**/*.{ts,tsx}',
        'apps/*/src/**/*.{ts,tsx}'
      ]
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'tests/load/**']
  },
  resolve: {
    alias: {
      '@teei/shared-utils': path.resolve(__dirname, './packages/shared-utils/src'),
      '@teei/event-contracts': path.resolve(__dirname, './packages/event-contracts/src'),
      '@teei/shared-schema': path.resolve(__dirname, './packages/shared-schema/src'),
      '@teei/events': path.resolve(__dirname, './packages/events/src'),
      '@teei/observability': path.resolve(__dirname, './packages/observability/src'),
      '@teei/http-client': path.resolve(__dirname, './packages/http-client/src'),
      '@teei/auth': path.resolve(__dirname, './packages/auth/src'),
      '@teei/contracts': path.resolve(__dirname, './packages/contracts/src')
    }
  }
});
