# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the FastMCP Cloudflare Workers adapter.

## Overview

This is `fastmcp-cloudflare`, a Cloudflare Workers adapter for [FastMCP](https://github.com/punkpeye/fastmcp) that enables building MCP (Model Context Protocol) servers that run on Cloudflare's edge network. This package provides a non-intrusive way to add Workers support without modifying the core FastMCP library.

## Development Commands

### Building and Testing
```bash
# Build the package
npm run build

# Run tests
npm run test

# Type checking
npm run type-check

# Lint code
npm run lint
```

### Development with Examples
```bash
# Run basic example locally
cd examples/basic
npm install
npm run dev

# Deploy example to Workers
npm run deploy

# Test deployed example
curl https://your-worker.workers.dev/health
```

### Testing the Package
```bash
# Test MCP protocol endpoints
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'

# Test specific tool
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "greet", "arguments": {"name": "World"}}}'
```

## Architecture

### Core Components

#### 1. WorkersFastMCP (`src/WorkersFastMCP.ts`)
Main adapter class that wraps FastMCP for Workers compatibility:
- Extends FastMCP functionality for Workers environment
- Provides `toWorkerHandler()` method for Workers integration
- Handles Workers-specific authentication patterns
- Manages OAuth discovery endpoints
- Configures health check endpoints

#### 2. WorkersTransport (`src/transports/WorkersTransport.ts`)
HTTP-based transport implementing MCP protocol over Workers fetch API:
- Converts Workers Request/Response to MCP transport interface
- Handles CORS preflight and response headers
- Implements request/response message passing
- Provides timeout and error handling

#### 3. Runtime Compatibility (`src/runtime/`)
- **detection.ts**: Runtime environment detection (Workers vs Node.js)
- **polyfills.ts**: Node.js API polyfills for Workers environment
  - EventEmitter implementation
  - fs/promises polyfill (URL-based only)
  - Buffer and process polyfills
  - Initialization functions

#### 4. Content Helpers (`src/utils/content-helpers.ts`)
Workers-compatible versions of FastMCP content functions:
- `imageContent()`: Supports URL and Buffer inputs (no file system)
- `audioContent()`: Same as image but for audio content
- MIME type detection from headers and file extensions
- Base64 encoding utilities

#### 5. Response Helpers (`src/utils/response-helpers.ts`)
Utility functions for creating Workers responses:
- JSON response creation
- MCP error response formatting
- CORS response handling
- Health check responses

### Key Design Patterns

#### Workers Handler Pattern
```typescript
const server = new WorkersFastMCP({
  name: "My Server",
  version: "1.0.0"
});

// Export as Workers handler
export default server.toWorkerHandler();
```

#### Environment Access Pattern
```typescript
server.addTool({
  name: "example",
  execute: async (args, context, env) => {
    // Access Workers environment (KV, D1, R2, etc.)
    const data = await env.MY_KV.get('key');
    const apiKey = env.API_KEY;
    return data;
  }
});
```

#### Content Loading Pattern (Workers-Specific)
```typescript
// URL-based content loading (no file system access)
const image = await imageContent({ 
  url: 'https://example.com/image.jpg' 
});

// Buffer-based content
const audio = await audioContent({ 
  buffer: someBufferData 
});
```

### Transport Architecture
- **Input**: Workers Request object (fetch handler)
- **Processing**: MCP protocol message handling
- **Output**: Workers Response object with JSON
- **Streaming**: Uses Workers Response streaming where appropriate

## Project Structure

```
src/
├── index.ts                     # Main exports
├── WorkersFastMCP.ts           # Core adapter class
├── transports/
│   └── WorkersTransport.ts     # HTTP transport for Workers
├── runtime/
│   ├── detection.ts            # Environment detection
│   └── polyfills.ts           # Node.js API polyfills
└── utils/
    ├── content-helpers.ts      # Workers-compatible content functions
    └── response-helpers.ts     # Response utilities

examples/
├── basic/                      # Complete basic example
│   ├── index.ts               # Basic server implementation
│   ├── wrangler.toml         # Workers configuration
│   ├── package.json          # Example dependencies
│   └── README.md             # Usage instructions
├── authenticated/             # (TODO) Auth example
└── advanced/                  # (TODO) Advanced features

docs/
├── setup.md                   # Complete setup guide
├── migration.md              # Node.js to Workers migration
├── deployment.md             # (TODO) Production deployment
└── api.md                    # (TODO) API reference
```

## Key Dependencies

### Runtime Dependencies
- **fastmcp**: Peer dependency - core FastMCP framework
- **@cloudflare/workers-types**: TypeScript types for Workers
- **@standard-schema/spec**: Schema validation interface
- **zod**: Schema validation (used in examples)

### Workers-Specific Features
- **nodejs_compat**: Compatibility flag required in wrangler.toml
- **Web APIs**: fetch, Request, Response, Headers
- **Workers APIs**: KV, D1, R2, Queues (accessed via env parameter)

## Configuration Patterns

### Wrangler Configuration (wrangler.toml)
```toml
name = "my-mcp-server"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[vars]
API_KEY = "secret-key"

[[kv_namespaces]]
binding = "CACHE"
id = "kv-namespace-id"
```

### Server Configuration
```typescript
const server = new WorkersFastMCP({
  name: "Server Name",
  version: "1.0.0",
  
  // Workers-specific transport config
  transport: {
    pathPrefix: "/mcp",  // Default endpoint
    maxBodySize: 1024 * 1024,  // 1MB limit
    timeout: 30000,  // 30s timeout
  },
  
  // CORS configuration
  cors: {
    enabled: true,
    origins: ["*"],  // or specific domains
    credentials: false,
  },
  
  // Health check config
  health: {
    enabled: true,
    path: "/health",
    message: "OK",
  },
  
  // Workers authentication
  authenticate: async (request: Request, env) => {
    const token = request.headers.get('authorization');
    // Validate token and return user context
    return { userId: 'user123' };
  },
});
```

## Testing Strategy

### Unit Testing
- Runtime detection functions
- Content helper functions
- Response utility functions
- Transport message handling

### Integration Testing
- Full MCP protocol flow
- Workers Request/Response handling
- Authentication flows
- Error handling scenarios

### Example Testing
- Basic example functionality
- Tool execution
- Resource access
- Health check endpoints

## Common Development Tasks

### Adding New Tools
Tools work exactly like FastMCP but with Workers environment access:
```typescript
server.addTool({
  name: "my_tool",
  description: "Description",
  parameters: z.object({ param: z.string() }),
  execute: async (args, context, env) => {
    // Access Workers environment
    const data = await env.MY_KV.get('key');
    return `Result: ${data}`;
  }
});
```

### Adding Resources
Resources support URL-based content loading:
```typescript
server.addResource({
  uri: "resource://example",
  name: "Example Resource",
  mimeType: "application/json",
  async load() {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    return { text: JSON.stringify(data, null, 2) };
  }
});
```

### Environment Variable Access
Access through the env parameter in tool execution:
```typescript
execute: async (args, context, env) => {
  const apiKey = env.API_KEY;  // From wrangler.toml [vars]
  const cache = env.CACHE;     // KV binding
  const db = env.DB;           // D1 binding
}
```

## Debugging and Troubleshooting

### Common Issues
1. **"nodejs_compat not found"**: Ensure compatibility_date is 2024-09-23 or later
2. **CORS errors**: Check CORS configuration and origins
3. **Environment variables undefined**: Verify wrangler.toml configuration
4. **Content loading fails**: Remember Workers can only access URLs, not file system

### Debugging Tools
```bash
# Local development with logs
wrangler dev --local

# View production logs
wrangler tail

# Test specific endpoints
curl -v http://localhost:8787/health
```

### Log Patterns
```typescript
// Use console.log for debugging (appears in wrangler tail)
server.addTool({
  execute: async (args, context, env) => {
    console.log('Tool executed:', args);
    console.log('Environment keys:', Object.keys(env));
    return result;
  }
});
```

## Compatibility System

### Overview
This package includes a comprehensive compatibility checking system to ensure it remains compatible with FastMCP as it evolves:

### Compatibility Components

#### 1. Version Checking (`src/compatibility/version-check.ts`)
- **Supported Version Range**: Defines minimum and maximum supported FastMCP versions
- **API Surface Validation**: Checks that expected FastMCP methods and properties exist
- **Runtime Assertion**: `assertFastMCPCompatibility()` throws if incompatible version detected
- **Compatibility Reporting**: `getCompatibilityReport()` provides detailed compatibility status

#### 2. Interface Validation (`src/compatibility/interface-validation.ts`)
- **Tool Definition Validation**: Ensures tool definitions match expected FastMCP interface
- **Resource Definition Validation**: Validates resource definitions for compatibility
- **Prompt Definition Validation**: Checks prompt definitions against expected schema
- **Runtime Validation**: All `addTool`, `addResource`, `addPrompt` calls are validated

#### 3. Automated Testing (`tests/unit/compatibility.test.ts`)
- **Version Compatibility Tests**: Automatically test against supported FastMCP versions
- **Interface Compatibility Tests**: Validate all expected FastMCP APIs are present
- **Integration Tests**: Test actual FastMCP instance creation and method calls

#### 4. CI/CD Integration (`.github/workflows/compatibility-check.yml`)
- **Multi-Version Testing**: Tests against multiple FastMCP versions in CI
- **Daily Compatibility Checks**: Scheduled tests to catch breaking changes early
- **Breaking Change Detection**: Automatic detection of compatibility-related changes
- **Issue Creation**: Automatically creates GitHub issues when compatibility breaks

### Usage Patterns

#### Automatic Compatibility Checking (Default)
```typescript
const server = new WorkersFastMCP({
  name: "My Server",
  version: "1.0.0",
  // Compatibility checking enabled by default
});
```

#### Skip Compatibility Checking (Not Recommended)
```typescript
const server = new WorkersFastMCP({
  name: "My Server", 
  version: "1.0.0",
  skipCompatibilityCheck: true, // Only for debugging
});
```

#### Manual Compatibility Checking
```typescript
import { checkFastMCPCompatibility, getCompatibilityReport } from 'fastmcp-cloudflare';

// Check compatibility
const result = checkFastMCPCompatibility();
if (!result.compatible) {
  console.error('Compatibility issues:', result.issues);
}

// Get detailed report
const report = getCompatibilityReport();
console.log('Compatibility report:', report);
```

### Development Workflow

#### Testing Compatibility
```bash
# Run compatibility-specific tests
npm run test:compatibility

# Run full test suite
npm test

# Test against specific FastMCP version
npm install fastmcp@1.0.0
npm run test:compatibility
```

#### Updating Supported Versions
When a new FastMCP version is released:

1. **Update version range** in `src/compatibility/version-check.ts`:
   ```typescript
   export const SUPPORTED_FASTMCP_VERSIONS = {
     minimum: '1.0.0',
     maximum: '2.0.0', // Update for new major version
     tested: ['1.0.0', '1.1.0'], // Add tested versions
   };
   ```

2. **Run compatibility tests**:
   ```bash
   npm install fastmcp@1.1.0
   npm run test:compatibility
   ```

3. **Update API expectations** if needed in `EXPECTED_FASTMCP_API`

4. **Update interface validation** if new fields are added to FastMCP interfaces

### Breaking Change Detection

The system detects several types of breaking changes:

#### FastMCP Version Changes
- New major versions that might break compatibility
- Removed or changed API methods
- Modified interface requirements

#### Interface Changes  
- Tools missing required fields (name, description, execute)
- Resources missing required fields (uri, name, load)
- Prompts missing required fields (name, load)
- Changed function signatures

#### Runtime Changes
- FastMCP class not available or not constructible
- Expected methods missing from instances
- Constructor parameter changes

### Compatibility Guarantees

#### What We Guarantee
- ✅ **API Compatibility**: All FastMCP APIs used by the adapter are validated
- ✅ **Interface Compatibility**: Tool/resource/prompt definitions are validated
- ✅ **Version Compatibility**: Supported version ranges are enforced
- ✅ **Runtime Compatibility**: FastMCP instance creation and method calls are tested

#### What We Don't Guarantee
- ❌ **Internal Implementation Changes**: FastMCP internal changes not exposed through public API
- ❌ **Performance Characteristics**: Timing or performance changes in FastMCP
- ❌ **Undocumented Features**: Features not part of the official FastMCP API

### Handling Compatibility Issues

#### When Compatibility Breaks
1. **Check the compatibility report** to understand what changed
2. **Review FastMCP changelog** for breaking changes
3. **Update the adapter** to work with new FastMCP version
4. **Update compatibility definitions** to reflect new supported versions
5. **Run full test suite** to ensure everything works

#### Emergency Compatibility Override
If you need to bypass compatibility checks temporarily:

```typescript
const server = new WorkersFastMCP({
  name: "My Server",
  version: "1.0.0", 
  skipCompatibilityCheck: true, // ONLY for emergency use
});
```

**Warning**: This disables all compatibility validation and should only be used for debugging or emergency situations.

## Future Development

### Planned Features
- Advanced authentication examples
- Streaming response examples
- Durable Objects integration
- Queue-based background processing
- Enhanced compatibility checking with API change detection

### Extension Points
- Custom transport implementations
- Additional content type handlers
- Authentication middleware patterns
- Response transformation utilities
- Compatibility plugin system for custom validations

This package is designed to be a complete, production-ready adapter for running FastMCP on Cloudflare Workers while maintaining full compatibility with the core FastMCP API through comprehensive compatibility checking and validation systems.