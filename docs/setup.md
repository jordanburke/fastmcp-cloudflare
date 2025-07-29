# FastMCP for Cloudflare Workers - Setup Guide

This guide will help you get started with building MCP servers on Cloudflare Workers using FastMCP.

## Prerequisites

- Node.js 18+ installed
- A Cloudflare account (free tier works)
- Basic familiarity with TypeScript/JavaScript
- Understanding of the MCP (Model Context Protocol) concepts

## Installation

### 1. Install Dependencies

```bash
npm install fastmcp fastmcp-cloudflare zod
```

### 2. Install Wrangler CLI

```bash
npm install -g wrangler
# or use npx for project-specific usage
npm install --save-dev wrangler
```

### 3. Authenticate with Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

## Project Setup

### 1. Create a New Project

```bash
mkdir my-mcp-server
cd my-mcp-server
npm init -y
```

### 2. Install Dependencies

```bash
npm install fastmcp fastmcp-cloudflare @cloudflare/workers-types zod
npm install --save-dev wrangler typescript
```

### 3. Create Wrangler Configuration

Create a `wrangler.toml` file:

```toml
name = "my-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[env.production]
vars = { ENVIRONMENT = "production" }
```

### 4. Create TypeScript Configuration

Create a `tsconfig.json` file:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "WebWorker"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

## Creating Your First MCP Server

### 1. Create the Main Server File

Create `src/index.ts`:

```typescript
import { WorkersFastMCP } from 'fastmcp-cloudflare';
import { z } from 'zod';

const server = new WorkersFastMCP({
  name: "My MCP Server",
  version: "1.0.0",
  description: "My first MCP server on Cloudflare Workers",
});

// Add a simple tool
server.addTool({
  name: "hello",
  description: "Say hello to someone",
  parameters: z.object({
    name: z.string().describe("The name to greet"),
  }),
  execute: async (args) => {
    return `Hello, ${args.name}! This message comes from Cloudflare Workers.`;
  },
});

// Export the Workers handler
export default server.toWorkerHandler();
```

### 2. Add Package Scripts

Update your `package.json`:

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "curl -X POST http://localhost:8787/mcp -H 'Content-Type: application/json' -d '{\"method\":\"tools/list\"}'"
  }
}
```

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

Your server will be available at `http://localhost:8787`

### 2. Test Your Server

Test the health endpoint:
```bash
curl http://localhost:8787/health
```

Test the MCP endpoint:
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

### 3. Test a Tool

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "hello",
      "arguments": {
        "name": "World"
      }
    }
  }'
```

## Deployment

### 1. Deploy to Workers

```bash
npm run deploy
```

Your server will be deployed to `https://my-mcp-server.your-subdomain.workers.dev`

### 2. Custom Domain (Optional)

To use a custom domain, add to your `wrangler.toml`:

```toml
routes = [
  { pattern = "mcp.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

Then deploy:
```bash
wrangler deploy
```

## Environment Configuration

### Environment Variables

Add environment variables to your `wrangler.toml`:

```toml
[vars]
API_KEY = "your-api-key"
DEBUG_MODE = "false"

[env.production.vars]
DEBUG_MODE = "false"
LOG_LEVEL = "warn"
```

Access them in your code:
```typescript
const server = new WorkersFastMCP({
  name: "My Server",
  version: "1.0.0",
  // Environment variables are available through the env parameter
  // in your tools' execute functions
});
```

### Secrets

For sensitive data, use Wrangler secrets:

```bash
wrangler secret put API_SECRET
```

## Testing Your Deployment

### 1. Health Check

```bash
curl https://my-mcp-server.your-subdomain.workers.dev/health
```

### 2. MCP Protocol Test

```bash
curl -X POST https://my-mcp-server.your-subdomain.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

## Common Configuration Options

### CORS Configuration

```typescript
const server = new WorkersFastMCP({
  name: "My Server",
  version: "1.0.0",
  cors: {
    enabled: true,
    origins: ["https://myapp.com", "https://localhost:3000"],
    credentials: true,
  },
});
```

### Transport Configuration

```typescript
const server = new WorkersFastMCP({
  name: "My Server",
  version: "1.0.0",
  transport: {
    pathPrefix: "/api/mcp", // Default: "/mcp"
    maxBodySize: 2 * 1024 * 1024, // 2MB
    timeout: 60000, // 60 seconds
  },
});
```

### Health Check Configuration

```typescript
const server = new WorkersFastMCP({
  name: "My Server",
  version: "1.0.0",
  health: {
    enabled: true,
    path: "/status", // Default: "/health"
    message: "Server is running!",
    status: 200,
  },
});
```

## Next Steps

- [Migration Guide](./migration.md) - Migrating from Node.js FastMCP
- [Deployment Guide](./deployment.md) - Production deployment best practices
- [API Reference](./api.md) - Complete API documentation
- [Examples](../examples/) - Working examples and patterns

## Troubleshooting

### Common Issues

1. **"nodejs_compat" not working**: Ensure your `compatibility_date` is "2024-09-23" or later
2. **CORS errors**: Check your CORS configuration and origins
3. **Build errors**: Verify your TypeScript configuration and imports
4. **Deployment fails**: Check your Wrangler authentication and project configuration

### Getting Help

- [GitHub Issues](https://github.com/jordanburke/fastmcp-cloudflare/issues)
- [FastMCP Documentation](https://github.com/punkpeye/fastmcp)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)