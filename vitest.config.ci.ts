import { defineConfig } from 'vitest/config';

// Special configuration for CI environments that might have package resolution issues
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'examples', 'tests/unit/compatibility.test.ts'],
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
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      'fastmcp-cloudflare': './src/index.ts',
    },
    conditions: ['node', 'import', 'module', 'default'],
    mainFields: ['module', 'main'],
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    preserveSymlinks: false,
  },
  // Skip optimization that might cause issues in CI
  optimizeDeps: {
    disabled: true,
  },
  esbuild: {
    target: 'node18',
  },
  define: {
    'process.env.NODE_ENV': '"test"',
  },
});