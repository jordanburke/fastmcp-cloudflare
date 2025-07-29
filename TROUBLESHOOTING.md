# Troubleshooting

This document covers common issues and their solutions when working with the FastMCP Cloudflare adapter.

## Package Resolution Issues in CI/Testing

### Problem
You may encounter errors like:
```
Error: Failed to resolve entry for package "fastmcp". The package may have incorrect main/module/exports specified in its package.json.
```

This typically occurs in CI environments or with certain package managers (especially with pnpm or different Node.js versions).

### Solutions

#### Solution 1: Use Alternative Test Configuration
If the main test suite fails due to package resolution, use the CI-specific configuration:

```bash
# Instead of npm test, use:
npm run test:ci

# Or run only the simple compatibility tests:
npm run test:simple
```

#### Solution 2: Install FastMCP as Direct Dependency
If you're using this package in a project where FastMCP resolution is problematic, you can install FastMCP directly:

```bash
npm install fastmcp
# or
pnpm add fastmcp
# or  
yarn add fastmcp
```

#### Solution 3: Update Vitest Configuration
If you're extending this project, you can enhance the vitest configuration with better module resolution:

```typescript
// vitest.config.ts
export default defineConfig({
  resolve: {
    conditions: ['node', 'import', 'module', 'default'],
    mainFields: ['module', 'main'],
    preserveSymlinks: false,
  },
  deps: {
    inline: ['fastmcp'],
    fallbackCJS: true,
  },
  ssr: {
    noExternal: ['fastmcp'],
  },
});
```

#### Solution 4: Environment-Specific Package Manager Commands
Different package managers handle peer dependencies differently:

**With npm:**
```bash
npm install --legacy-peer-deps
npm test
```

**With pnpm:**
```bash
pnpm install --shamefully-hoist
npm test
```

**With yarn:**
```bash
yarn install --flat
npm test
```

### Why This Happens

The FastMCP package uses ESM (ECMAScript modules) and has a specific export configuration that some build tools or CI environments may not resolve correctly. This is particularly common with:

1. **Different Node.js versions** - Older versions may not handle ESM exports the same way
2. **Package manager differences** - pnpm's symlink strategy vs npm's flat structure
3. **CI environment differences** - Limited file system permissions or different module resolution paths
4. **Vitest/Vite version differences** - Different versions handle module resolution differently

### Verification

To verify the fix works, run:

```bash
# Test basic functionality without FastMCP import issues
npm run test:simple

# Test with CI configuration
npm run test:ci

# Test full suite (if package resolution is working)
npm test
```

All tests should pass, confirming that the FastMCP Cloudflare adapter is working correctly regardless of the package resolution approach used.