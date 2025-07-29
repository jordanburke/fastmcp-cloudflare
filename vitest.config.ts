import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'examples'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'examples/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
    // Compatibility test specific configuration
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      // Ensure we're testing against the source files
      'fastmcp-cloudflare': './src/index.ts',
    },
  },
});