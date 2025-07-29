# Basic FastMCP Workers Example

This example demonstrates a simple MCP server running on Cloudflare Workers.

## Features

- ✅ Basic tool definitions with type-safe parameters
- ✅ Resource serving
- ✅ Prompt templates
- ✅ Health check endpoint
- ✅ CORS handling
- ✅ URL-based content fetching
- ✅ Environment information

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Test the health endpoint:**
   ```bash
   curl http://localhost:8787/health
   ```

4. **Deploy to Cloudflare Workers:**
   ```bash
   npm run deploy
   ```

## Available Endpoints

- `GET /health` - Health check endpoint
- `POST /mcp` - MCP protocol endpoint

## Tools Available

### greet
Greet someone with a personalized message in multiple languages.

**Parameters:**
- `name` (string, required): The name of the person to greet
- `language` (string, optional): Language for the greeting (en, es, fr, de)

**Example:**
```json
{
  "name": "greet",
  "arguments": {
    "name": "Alice",
    "language": "es"
  }
}
```

### server_info
Get information about the server and its environment.

**Example:**
```json
{
  "name": "server_info",
  "arguments": {}
}
```

### fetch_content
Fetch content from a URL (demonstrates Workers' fetch capability).

**Parameters:**
- `url` (string, required): The URL to fetch content from
- `include_headers` (boolean, optional): Whether to include response headers

**Example:**
```json
{
  "name": "fetch_content",
  "arguments": {
    "url": "https://httpbin.org/json",
    "include_headers": true
  }
}
```

## Resources Available

### workers://info
Information about the Cloudflare Workers environment, including features and limits.

## Prompts Available

### workers-code-generator
Generate Cloudflare Workers code based on requirements.

**Parameters:**
- `functionality` (string, required): What functionality should the Worker provide?
- `apis` (string, optional): Which Cloudflare APIs should be used?

## Testing with MCP CLI

You can test this server using the MCP CLI tools:

```bash
# Using npx (if fastmcp-cloudflare CLI is available)
npx fastmcp-cloudflare dev examples/basic/index.ts

# Or test the deployed version directly
curl -X POST https://your-worker.your-subdomain.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'
```

## Configuration

The `wrangler.toml` file contains the Workers configuration. Key settings:

- `compatibility_date`: Set to "2024-09-23" or later
- `compatibility_flags`: Includes "nodejs_compat" for Node.js API compatibility
- Environment variables can be configured in the `[vars]` section
- Different environments (production, staging) can be configured

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run deploy:production
```

### Monitoring
```bash
npm run tail:production
```

## Next Steps

- Check out the [authenticated example](../authenticated/) for authentication patterns
- See the [advanced example](../advanced/) for more complex features
- Read the [deployment guide](../../docs/deployment.md) for production best practices