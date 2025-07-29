/**
 * Cloudflare Workers transport for FastMCP
 * Implements MCP transport using Workers Request/Response pattern
 */

import { Transport } from 'fastmcp';
import { assertWorkersRuntime } from '../runtime/detection.js';

/**
 * Transport configuration for Cloudflare Workers
 */
export interface WorkersTransportOptions {
  /**
   * Path prefix for MCP endpoints (default: '/mcp')
   */
  pathPrefix?: string;
  
  /**
   * CORS configuration
   */
  cors?: {
    enabled?: boolean;
    origins?: string[];
    credentials?: boolean;
  };

  /**
   * Maximum request body size in bytes
   */
  maxBodySize?: number;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Default transport options
 */
const DEFAULT_OPTIONS: Required<WorkersTransportOptions> = {
  pathPrefix: '/mcp',
  cors: {
    enabled: true,
    origins: ['*'],
    credentials: false,
  },
  maxBodySize: 1024 * 1024, // 1MB
  timeout: 30000, // 30 seconds
};

/**
 * Workers transport implementation
 */
export class WorkersTransport implements Transport {
  private options: Required<WorkersTransportOptions>;
  private messageHandlers = new Set<(message: any) => void>();
  private closeHandlers = new Set<() => void>();
  private errorHandlers = new Set<(error: Error) => void>();

  constructor(options: WorkersTransportOptions = {}) {
    assertWorkersRuntime();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Handle incoming Workers request and create appropriate response
   */
  async handleRequest(request: Request, env?: any): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return this.handleCors(request);
    }

    // Check if request is for MCP endpoint
    if (!url.pathname.startsWith(this.options.pathPrefix)) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      // Validate request method
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { 
          status: 405,
          headers: { 'Allow': 'POST, OPTIONS' }
        });
      }

      // Validate content type
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return new Response('Bad Request: Content-Type must be application/json', { 
          status: 400 
        });
      }

      // Check content length
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > this.options.maxBodySize) {
        return new Response('Payload Too Large', { status: 413 });
      }

      // Parse request body
      const body = await request.text();
      let message;
      
      try {
        message = JSON.parse(body);
      } catch {
        return new Response('Bad Request: Invalid JSON', { status: 400 });
      }

      // Process MCP message
      const response = await this.processMessage(message, env);
      
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...this.getCorsHeaders(request),
        },
      });

    } catch (error) {
      console.error('Error handling MCP request:', error);
      
      return new Response(
        JSON.stringify({
          error: {
            code: -32603,
            message: 'Internal error',
            data: error instanceof Error ? error.message : String(error),
          },
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...this.getCorsHeaders(request),
          },
        }
      );
    }
  }

  /**
   * Process MCP protocol message
   */
  private async processMessage(message: any, env?: any): Promise<any> {
    // Emit message to handlers (this will be connected to FastMCP server)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, this.options.timeout);

      // Create response handler
      const responseHandler = (response: any) => {
        clearTimeout(timeout);
        resolve(response);
      };

      // Emit to message handlers with response callback
      this.messageHandlers.forEach(handler => {
        try {
          handler({ ...message, _responseHandler: responseHandler, _env: env });
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  /**
   * Handle CORS preflight requests
   */
  private handleCors(request: Request): Response {
    if (!this.options.cors.enabled) {
      return new Response('CORS disabled', { status: 403 });
    }

    return new Response(null, {
      status: 204,
      headers: this.getCorsHeaders(request),
    });
  }

  /**
   * Get CORS headers for response
   */
  private getCorsHeaders(request: Request): Record<string, string> {
    if (!this.options.cors.enabled) {
      return {};
    }

    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    const origin = request.headers.get('origin');
    const { origins, credentials } = this.options.cors;

    if (origins.includes('*')) {
      headers['Access-Control-Allow-Origin'] = '*';
    } else if (origin && origins.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
    }

    if (credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    return headers;
  }

  /**
   * Transport interface implementation
   */
  onmessage?: (message: any) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  send(message: any): void {
    // In Workers transport, sending is handled by the response mechanism
    // This method is called by FastMCP server to send responses
    if (message._responseHandler) {
      message._responseHandler(message);
    }
  }

  close(): void {
    this.closeHandlers.forEach(handler => handler());
    this.messageHandlers.clear();
    this.closeHandlers.clear();
    this.errorHandlers.clear();
  }

  addEventListener(event: string, handler: any): void {
    switch (event) {
      case 'message':
        this.messageHandlers.add(handler);
        break;
      case 'close':
        this.closeHandlers.add(handler);
        break;
      case 'error':
        this.errorHandlers.add(handler);
        break;
    }
  }

  removeEventListener(event: string, handler: any): void {
    switch (event) {
      case 'message':
        this.messageHandlers.delete(handler);
        break;
      case 'close':
        this.closeHandlers.delete(handler);
        break;
      case 'error':
        this.errorHandlers.delete(handler);
        break;
    }
  }
}

/**
 * Create a Workers request handler from transport
 */
export function createWorkerHandler(
  transport: WorkersTransport
): (request: Request, env?: any) => Promise<Response> {
  return (request: Request, env?: any) => transport.handleRequest(request, env);
}