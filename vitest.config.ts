import { defineConfig } from 'vitest/config';
import path from 'path';
import { resolveFastMCP } from './vitest.fastmcp.resolver.js';

export default defineConfig({
  plugins: [resolveFastMCP()],
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
      'fastmcp-cloudflare': path.resolve(__dirname, './src/index.ts'),
    },
    conditions: ['node', 'import', 'module', 'default'],
    // More aggressive module resolution
    mainFields: ['module', 'main'],
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    // Preserve symlinks for pnpm compatibility
    preserveSymlinks: false,
  },
  optimizeDeps: {
    include: ['fastmcp'],
    // Force pre-bundling
    force: true,
  },
  ssr: {
    noExternal: ['fastmcp'],
  },
  // Additional configuration for dependency resolution
  deps: {
    external: [],
    inline: ['fastmcp'],
    // Try to fallback to node resolution
    fallbackCJS: true,
  },
  // Additional configuration for better compatibility
  esbuild: {
    target: 'node18',
  },
  define: {
    // Ensure proper environment detection
    'process.env.NODE_ENV': '"test"',
  },
});