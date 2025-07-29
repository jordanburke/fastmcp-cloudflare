# FastMCP for Cloudflare Workers

A Cloudflare Workers adapter for [FastMCP](https://github.com/punkpeye/fastmcp) that enables you to build and deploy MCP (Model Context Protocol) servers on Cloudflare's edge network.

## Features

- 🚀 **Edge Performance**: Run MCP servers on Cloudflare's global edge network
- 🔄 **Full FastMCP Compatibility**: Use all FastMCP features with Workers-specific optimizations
- 🛡️ **Built-in Security**: Leverage Cloudflare's security features and authentication
- 📦 **Zero Config**: Simple setup with minimal configuration required
- 🌐 **HTTP Streaming**: Native support for streaming responses
- 🔐 **Authentication**: OAuth and custom authentication support

## Quick Start

### Prerequisites

- Node.js 20.x or higher (for better ESM module support)
- npm, yarn, or pnpm package manager

### Installation

```bash
npm install fastmcp fastmcp-cloudflare
```

### Basic Usage

```typescript
import { WorkersFastMCP } from 'fastmcp-cloudflare';
import { z } from 'zod';

const server = new WorkersFastMCP({
  name: "My Workers MCP Server",
  version: "1.0.0",
});

server.addTool({
  name: "greet",
  description: "Greet someone",
  parameters: z.object({
    name: z.string(),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}! This response comes from Cloudflare Workers.`;
  },
});

// Export as Workers handler
export default server.toWorkerHandler();
```

### Wrangler Configuration

Create a `wrangler.toml` file:

```toml
name = "my-mcp-server"
compatibility_flags = ["nodejs_compat"]
compatibility_date = "2024-09-23"

[env.production]
vars = { ENVIRONMENT = "production" }
```

### Deploy

```bash
npx wrangler deploy
```

## Documentation

- [Setup Guide](./docs/setup.md) - Getting started with FastMCP on Workers
- [Migration Guide](./docs/migration.md) - Migrating from Node.js FastMCP
- [Deployment Guide](./docs/deployment.md) - Production deployment patterns
- [API Reference](./docs/api.md) - Complete API documentation

## Examples

Check out the [examples directory](./examples/) for complete working examples:

- [Basic Server](./examples/basic/) - Simple MCP server
- [Authenticated Server](./examples/authenticated/) - Server with authentication
- [Advanced Features](./examples/advanced/) - Streaming, resources, and more

## Key Differences from Node.js FastMCP

- **No File System Access**: Use URL-based content loading instead of file paths
- **Workers Request/Response**: Built for Cloudflare's fetch handler pattern
- **Edge Optimized**: Optimized for fast cold starts and low latency
- **Built-in Scaling**: Automatic scaling with no infrastructure management

## Limitations

- No direct file system access (use URLs or inline content)
- Some Node.js APIs are polyfilled or unavailable
- Cold start considerations for infrequently used endpoints

## Development

### Testing

The project includes comprehensive tests to ensure compatibility with FastMCP:

```bash
# Run all tests
npm test

# Run compatibility tests (local development)
npm run test:compatibility

# Run CI-safe compatibility tests (for CI environments)
npm run test:compatibility:ci

# Run simple tests (fallback for package resolution issues)
npm run test:simple
```

**Note for CI Environments**: If you encounter FastMCP package resolution issues in CI, use `npm run test:compatibility:ci` which provides the same test coverage using mocked FastMCP imports. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for details.

### Building

```bash
# Build the package
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## Contributing

This is a community-driven project. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## License

MIT - see [LICENSE](./LICENSE) file for details.

## Support

- [GitHub Issues](https://github.com/jordanburke/fastmcp-cloudflare/issues)
- [FastMCP Documentation](https://github.com/punkpeye/fastmcp)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)