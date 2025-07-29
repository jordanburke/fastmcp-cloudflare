/**
 * Basic FastMCP server for Cloudflare Workers
 * 
 * This example demonstrates:
 * - Basic tool creation
 * - Simple resource serving
 * - Health check endpoint
 * - CORS handling
 */

import { WorkersFastMCP } from '../../src/index.js';
import { z } from 'zod';

// Create the Workers MCP server
const server = new WorkersFastMCP({
  name: "Basic Workers MCP Server",
  version: "1.0.0",
  description: "A simple MCP server running on Cloudflare Workers",
  instructions: "This server provides basic tools and resources for demonstration purposes.",
  
  // Health check configuration
  health: {
    enabled: true,
    path: '/health',
    message: 'Basic MCP Server is running on Cloudflare Workers!',
  },

  // CORS configuration
  cors: {
    enabled: true,
    origins: ['*'], // Allow all origins for demo
    credentials: false,
  },
});

// Add a simple greeting tool
server.addTool({
  name: "greet",
  description: "Greet someone with a personalized message",
  parameters: z.object({
    name: z.string().describe("The name of the person to greet"),
    language: z.enum(["en", "es", "fr", "de"]).optional().describe("Language for the greeting"),
  }),
  annotations: {
    title: "Greeting Tool",
    readOnlyHint: true,
    openWorldHint: false,
  },
  execute: async (args) => {
    const greetings = {
      en: `Hello, ${args.name}! Welcome to our MCP server running on Cloudflare Workers.`,
      es: `¡Hola, ${args.name}! Bienvenido a nuestro servidor MCP ejecutándose en Cloudflare Workers.`,
      fr: `Bonjour, ${args.name}! Bienvenue sur notre serveur MCP fonctionnant sur Cloudflare Workers.`,
      de: `Hallo, ${args.name}! Willkommen auf unserem MCP-Server, der auf Cloudflare Workers läuft.`,
    };

    const language = args.language || 'en';
    return greetings[language];
  },
});

// Add a tool that demonstrates Workers' global network
server.addTool({
  name: "server_info",
  description: "Get information about the server and its environment",
  parameters: z.object({}),
  annotations: {
    title: "Server Information",
    readOnlyHint: true,
    openWorldHint: false,
  },
  execute: async (args, context) => {
    // In a real Workers environment, you could access colo, ray ID, etc.
    const info = {
      server: "FastMCP on Cloudflare Workers",
      timestamp: new Date().toISOString(),
      environment: "Cloudflare Workers Edge Runtime",
      // Note: In actual Workers, you'd have access to:
      // - context.cf?.colo (data center)
      // - context.cf?.country (country code)
      // - request headers with ray ID, etc.
      capabilities: ["HTTP Streaming", "Global Edge Network", "Zero Cold Start"],
    };

    return {
      content: [
        {
          type: "text",
          text: `Server Information:\n${JSON.stringify(info, null, 2)}`,
        },
      ],
    };
  },
});

// Add a tool that demonstrates URL-based content fetching
server.addTool({
  name: "fetch_content",
  description: "Fetch content from a URL (demonstrates Workers' fetch capability)",
  parameters: z.object({
    url: z.string().url().describe("The URL to fetch content from"),
    include_headers: z.boolean().optional().describe("Whether to include response headers"),
  }),
  annotations: {
    title: "Content Fetcher",
    readOnlyHint: true,
    openWorldHint: true, // This tool interacts with external services
  },
  execute: async (args) => {
    try {
      const response = await fetch(args.url, {
        headers: {
          'User-Agent': 'FastMCP-Workers/1.0.0',
        },
      });

      if (!response.ok) {
        return `Error fetching ${args.url}: ${response.status} ${response.statusText}`;
      }

      const content = await response.text();
      const result = [`Content from ${args.url}:\n\n${content.slice(0, 1000)}${content.length > 1000 ? '...' : ''}`];

      if (args.include_headers) {
        const headers = Object.fromEntries(response.headers.entries());
        result.push(`\n\nResponse Headers:\n${JSON.stringify(headers, null, 2)}`);
      }

      return result.join('');
    } catch (error) {
      return `Error fetching content: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

// Add a simple resource
server.addResource({
  uri: "workers://info",
  name: "Workers Environment Info",
  mimeType: "application/json",
  async load() {
    return {
      text: JSON.stringify({
        platform: "Cloudflare Workers",
        runtime: "V8 JavaScript Engine",
        features: [
          "HTTP/HTTPS requests",
          "WebAssembly support",
          "Durable Objects",
          "KV storage",
          "R2 object storage",
          "D1 database",
          "Edge computing"
        ],
        limits: {
          "CPU time": "10ms-30s (depending on plan)",
          "Memory": "128MB",
          "Request size": "100MB",
          "Response size": "100MB"
        }
      }, null, 2),
    };
  },
});

// Add a prompt for generating Workers-specific code
server.addPrompt({
  name: "workers-code-generator",
  description: "Generate Cloudflare Workers code based on requirements",
  arguments: [
    {
      name: "functionality",
      description: "What functionality should the Worker provide?",
      required: true,
    },
    {
      name: "apis",
      description: "Which Cloudflare APIs should be used? (KV, D1, R2, etc.)",
      required: false,
    },
  ],
  load: async (args) => {
    const apis = args.apis ? ` using ${args.apis}` : '';
    return `Generate a Cloudflare Workers script that implements ${args.functionality}${apis}. 

The script should:
1. Use the Workers fetch event handler pattern
2. Include proper error handling
3. Follow Cloudflare Workers best practices
4. Include TypeScript types where appropriate
5. Handle CORS if needed
6. Be production-ready with proper logging

Please provide a complete, working example with comments explaining the key parts.`;
  },
});

// Export the Workers handler
export default server.toWorkerHandler();