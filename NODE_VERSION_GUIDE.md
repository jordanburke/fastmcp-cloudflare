# Node.js Version Guide for FastMCP Cloudflare

## Recommended Node.js Versions

### Current Recommendation: Node.js 20.x or 22.x

The FastMCP package resolution issues in CI environments are often related to Node.js version differences in how ESM modules are handled.

## Version Compatibility Matrix

| Node Version | ESM Support | FastMCP Compatibility | Recommended for CI |
|--------------|-------------|----------------------|-------------------|
| 16.x         | Basic       | ❌ Issues likely     | ❌ No            |
| 18.x         | Good        | ⚠️  May have issues  | ⚠️  Use fallbacks |
| 20.x (LTS)   | Excellent   | ✅ Full support      | ✅ Yes           |
| 22.x         | Excellent   | ✅ Full support      | ✅ Yes           |

## Why Node Version Matters

1. **ESM Module Resolution**: Node.js has evolved its ESM (ECMAScript Modules) support significantly:
   - Node 16: Basic ESM support, many edge cases
   - Node 18: Improved ESM, but some resolution quirks remain
   - Node 20+: Mature ESM support with better package.json exports handling

2. **Package.json "exports" Field**: FastMCP uses the "exports" field which is better supported in Node 20+

3. **Vite/Vitest Compatibility**: The testing framework works best with Node 18+ but has optimal performance with Node 20+

## Fixing CI Issues with Node Version

### Option 1: Update CI to Node 20.x or 22.x (Recommended)

In your GitHub Actions workflow:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20.x'  # or '22.x'
```

### Option 2: Keep Current Node Version with Workarounds

If you must use Node 18.x in CI:
1. Use the CI-safe tests: `npm run test:compatibility:ci`
2. Consider adding this to your CI workflow:
   ```yaml
   - name: Run compatibility tests
     run: |
       npm run test:compatibility || npm run test:compatibility:ci
   ```

### Option 3: Update package.json engines field

Be more specific about Node requirements:
```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## Testing Node Version Impact

You can test if Node version is the issue by:

```bash
# Test with different Node versions locally
nvm use 18
npm test  # May fail with package resolution

nvm use 20
npm test  # Should work

nvm use 22
npm test  # Should work
```

## Recommendation for Your Project

Since you're building for Cloudflare Workers (which uses V8 isolates, not Node.js), the Node version only matters for:
- Development environment
- Testing environment
- CI/CD pipeline

**Recommended approach:**
1. Set minimum Node version to 20.x in package.json
2. Use Node 20.x or 22.x in CI
3. Document this requirement clearly
4. Keep the CI-safe tests as a fallback for environments that can't upgrade

This will resolve most ESM module resolution issues while maintaining compatibility with modern tooling.