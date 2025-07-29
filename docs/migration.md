# Migration Guide: From Node.js FastMCP to Workers

This guide helps you migrate existing FastMCP servers from Node.js to Cloudflare Workers.

## Key Differences

### Runtime Environment
- **Node.js**: Full Node.js runtime with file system access
- **Workers**: V8 JavaScript engine with Web APIs, no file system

### Transport Layer
- **Node.js**: stdio, HTTP server using Node.js APIs
- **Workers**: HTTP-only using fetch handler pattern

### API Availability
- **Node.js**: Full Node.js standard library
- **Workers**: Web standards + limited Node.js compatibility layer

## Migration Steps

### 1. Update Dependencies

Replace your existing dependencies:

```bash
# Remove Node.js specific dependencies (if any)
npm uninstall fastmcp

# Install Workers-compatible versions
npm install fastmcp fastmcp-cloudflare @cloudflare/workers-types
npm install --save-dev wrangler
```

### 2. Update Server Initialization

**Before (Node.js):**
```typescript
import { FastMCP } from 'fastmcp';

const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
});

server.start({ transportType: "stdio" });
// or
server.start({ 
  transportType: "httpStream",
  httpStream: { port: 8080 }
});
```

**After (Workers):**
```typescript
import { WorkersFastMCP } from 'fastmcp-cloudflare';

const server = new WorkersFastMCP({
  name: "My Server",
  version: "1.0.0",
});

// Export as Workers handler
export default server.toWorkerHandler();
```

### 3. Update Content Helpers

**Before (Node.js):**
```typescript
import { imageContent } from 'fastmcp';

// File system access
return imageContent({ path: '/path/to/image.jpg' });
```

**After (Workers):**
```typescript
import { imageContent } from 'fastmcp-cloudflare';

// URL-based access only
return imageContent({ url: 'https://example.com/image.jpg' });

// Or with Buffer data
return imageContent({ buffer: someBufferData });
```

### 4. Update File Operations

**Before (Node.js):**
```typescript
import { readFile } from 'fs/promises';

const data = await readFile('/path/to/file.txt', 'utf8');
```

**After (Workers):**
```typescript
// Use fetch for external resources
const response = await fetch('https://example.com/data.txt');
const data = await response.text();

// Or use KV storage for persistent data
// const data = await env.MY_KV.get('key');
```

### 5. Update Environment Variables

**Before (Node.js):**
```typescript
const apiKey = process.env.API_KEY;
```

**After (Workers):**
```typescript
// Environment variables are passed through the env parameter
server.addTool({
  name: "example",
  execute: async (args, { session }, env) => {
    const apiKey = env.API_KEY;
    // ...
  },
});
```

### 6. Update Authentication

**Before (Node.js):**
```typescript
import http from 'http';

const server = new FastMCP({
  authenticate: (request: http.IncomingMessage) => {
    const authHeader = request.headers.authorization;
    // ...
  },
});
```

**After (Workers):**
```typescript
const server = new WorkersFastMCP({
  authenticate: async (request: Request, env) => {
    const authHeader = request.headers.get('authorization');
    // ...
  },
});
```

## Common Migration Patterns

### 1. Database Access

**Before (Node.js):**
```typescript
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

server.addTool({
  name: "query",
  execute: async (args) => {
    const result = await pool.query('SELECT * FROM users');
    return result.rows;
  },
});
```

**After (Workers with D1):**
```typescript
server.addTool({
  name: "query",
  execute: async (args, context, env) => {
    const result = await env.DB.prepare('SELECT * FROM users').all();
    return result.results;
  },
});
```

### 2. File Storage

**Before (Node.js):**
```typescript
import { writeFile } from 'fs/promises';

server.addTool({
  name: "save_file",
  execute: async (args) => {
    await writeFile('/uploads/' + args.filename, args.content);
    return 'File saved';
  },
});
```

**After (Workers with R2):**
```typescript
server.addTool({
  name: "save_file",
  execute: async (args, context, env) => {
    await env.STORAGE.put(args.filename, args.content);
    return 'File saved';
  },
});
```

### 3. Background Tasks

**Before (Node.js):**
```typescript
import { Worker } from 'worker_threads';

server.addTool({
  name: "process_data",
  execute: async (args) => {
    // Spawn background worker
    const worker = new Worker('./worker.js');
    // ...
  },
});
```

**After (Workers with Queues):**
```typescript
server.addTool({
  name: "process_data",
  execute: async (args, context, env) => {
    // Queue background task
    await env.QUEUE.send({
      type: 'process_data',
      data: args,
    });
    return 'Task queued';
  },
});
```

### 4. Caching

**Before (Node.js):**
```typescript
const cache = new Map();

server.addTool({
  name: "cached_operation",
  execute: async (args) => {
    if (cache.has(args.key)) {
      return cache.get(args.key);
    }
    const result = await expensiveOperation(args);
    cache.set(args.key, result);
    return result;
  },
});
```

**After (Workers with KV):**
```typescript
server.addTool({
  name: "cached_operation",
  execute: async (args, context, env) => {
    const cached = await env.CACHE.get(args.key, 'json');
    if (cached) {
      return cached;
    }
    
    const result = await expensiveOperation(args);
    await env.CACHE.put(args.key, JSON.stringify(result), {
      expirationTtl: 3600, // 1 hour
    });
    return result;
  },
});
```

## Configuration Migration

### Wrangler Configuration

Create a `wrangler.toml` file based on your Node.js server configuration:

```toml
name = "my-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# Migrate environment variables
[vars]
API_KEY = "your-api-key"
DEBUG_MODE = "false"

# Configure bindings based on your needs
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"

[[d1_databases]]
binding = "DB"
database_name = "your-db-name"
database_id = "your-db-id"
```

### Package.json Updates

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "build": "tsc && wrangler publish --dry-run"
  }
}
```

## Testing Your Migration

### 1. Local Development

```bash
npm run dev
```

Test endpoints:
```bash
# Health check
curl http://localhost:8787/health

# Tool execution
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

### 2. Deployment Testing

```bash
npm run deploy
```

Test your deployed Worker:
```bash
curl https://your-worker.your-subdomain.workers.dev/health
```

## Migration Checklist

- [ ] Replace FastMCP import with WorkersFastMCP
- [ ] Update server initialization and export pattern
- [ ] Replace file system operations with URL-based or storage bindings
- [ ] Update authentication to use Workers Request objects
- [ ] Replace Node.js-specific APIs with Web standards or polyfills
- [ ] Configure Wrangler with appropriate bindings
- [ ] Update environment variable access patterns
- [ ] Test all tools and resources locally
- [ ] Deploy and test in Workers environment
- [ ] Update documentation and deployment scripts

## Common Issues and Solutions

### Issue: `fs` module not found
**Solution**: Use URL-based content loading or storage bindings instead of file system

### Issue: Authentication not working
**Solution**: Update authentication function to handle Workers Request objects

### Issue: Environment variables undefined
**Solution**: Access via `env` parameter in tool execution context

### Issue: Buffer operations failing
**Solution**: Ensure `nodejs_compat` flag is enabled in wrangler.toml

### Issue: Streaming not working
**Solution**: Workers handle streaming differently; ensure proper Response handling

## Performance Considerations

- **Cold starts**: Workers have very fast cold starts compared to Node.js
- **Memory limits**: Workers have 128MB memory limit vs unlimited in Node.js
- **CPU time**: Workers have CPU time limits per request
- **Concurrent requests**: Workers can handle many concurrent requests efficiently

## Getting Help

If you encounter issues during migration:
1. Check the [troubleshooting section](./setup.md#troubleshooting)
2. Review the [examples](../examples/) for working patterns
3. [Open an issue](https://github.com/jordanburke/fastmcp-cloudflare/issues) for specific problems