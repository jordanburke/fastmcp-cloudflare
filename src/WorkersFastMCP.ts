/**
 * Cloudflare Workers adapter for FastMCP
 * Provides a Workers-optimized interface for building MCP servers
 */

import { FastMCP, FastMCPSessionAuth } from "fastmcp"
import { WorkersTransport, WorkersTransportOptions } from "./transports/WorkersTransport.js"
import { initializePolyfills } from "./runtime/polyfills.js"
import { assertWorkersRuntime } from "./runtime/detection.js"
import { imageContent, audioContent } from "./utils/content-helpers.js"
import type { ImageContent, AudioContent } from "./utils/content-helpers.js"
import { assertFastMCPCompatibility } from "./compatibility/version-check.js"
import {
  assertValidToolDefinition,
  assertValidResourceDefinition,
  assertValidPromptDefinition,
} from "./compatibility/interface-validation.js"
import type { ExecutionContext } from "@cloudflare/workers-types"

/**
 * Workers-specific server options extending FastMCP options
 */
export interface WorkersServerOptions<T extends FastMCPSessionAuth = FastMCPSessionAuth> {
  /**
   * Server name
   */
  name: string

  /**
   * Server version
   */
  version: string

  /**
   * Server description
   */
  description?: string

  /**
   * Server instructions for clients
   */
  instructions?: string

  /**
   * Authentication function (receives Workers Request object)
   */
  authenticate?: (request: Request, env?: any) => Promise<T>

  /**
   * Transport configuration
   */
  transport?: WorkersTransportOptions

  /**
   * OAuth configuration for Workers
   */
  oauth?: {
    enabled: boolean
    authorizationServer?: {
      issuer: string
      authorizationEndpoint: string
      tokenEndpoint: string
      jwksUri: string
      responseTypesSupported: string[]
    }
    protectedResource?: {
      resource: string
      authorizationServers: string[]
    }
  }

  /**
   * Health check configuration
   */
  health?: {
    enabled?: boolean
    path?: string
    message?: string
    status?: number
  }

  /**
   * CORS configuration (overrides transport CORS)
   */
  cors?: {
    enabled?: boolean
    origins?: string[]
    credentials?: boolean
  }

  /**
   * Skip compatibility checks (not recommended for production)
   */
  skipCompatibilityCheck?: boolean
}

/**
 * Default server options
 */
const DEFAULT_SERVER_OPTIONS = {
  transport: {
    pathPrefix: "/mcp",
    cors: {
      enabled: true,
      origins: ["*"],
      credentials: false,
    },
  },
  health: {
    enabled: true,
    path: "/health",
    message: "OK",
    status: 200,
  },
}

/**
 * Workers-optimized FastMCP server
 */
export class WorkersFastMCP<T extends FastMCPSessionAuth = FastMCPSessionAuth> {
  private fastmcp: FastMCP<T>
  private transport: WorkersTransport
  private options: WorkersServerOptions<T>

  constructor(options: WorkersServerOptions<T>) {
    // Ensure we're in Workers environment
    assertWorkersRuntime()

    // Check FastMCP compatibility unless explicitly skipped
    if (!options.skipCompatibilityCheck) {
      try {
        assertFastMCPCompatibility()
      } catch (error) {
        console.error("FastMCP compatibility check failed:", error)
        throw error
      }
    }

    this.options = { ...DEFAULT_SERVER_OPTIONS, ...options }

    // Initialize polyfills for Workers environment
    initializePolyfills()

    // Create transport with merged options
    const transportOptions: WorkersTransportOptions = {
      ...this.options.transport,
      cors: this.options.cors || this.options.transport?.cors,
    }

    this.transport = new WorkersTransport(transportOptions)

    // Create FastMCP instance with Workers-compatible configuration
    this.fastmcp = new FastMCP({
      name: this.options.name,
      version: this.options.version,
      instructions: this.options.instructions,
      // Note: We'll handle authentication at the Workers level
      authenticate: this.options.authenticate ? this.createAuthWrapper() : undefined,
      oauth: this.options.oauth,
      // Disable features that don't work well in Workers
      ping: { enabled: false }, // Disable ping in Workers
      roots: { enabled: false }, // Disable roots in Workers
    })

    // Connect transport to FastMCP
    this.connectTransport()
  }

  /**
   * Create authentication wrapper that handles Workers Request objects
   */
  private createAuthWrapper() {
    return async (request: any): Promise<T> => {
      if (!this.options.authenticate) {
        throw new Error("Authentication function not provided")
      }

      // Extract Workers Request and env from transport message
      const workersRequest = request._workersRequest
      const env = request._env

      if (!workersRequest) {
        throw new Error("Workers Request object not found in authentication context")
      }

      return await this.options.authenticate(workersRequest, env)
    }
  }

  /**
   * Connect Workers transport to FastMCP server
   */
  private connectTransport(): void {
    // Set up message handling
    this.transport.addEventListener("message", (message: any) => {
      // Add Workers-specific context to the message
      if (this.fastmcp.server) {
        // Forward message to FastMCP server
        this.fastmcp.server.handleMessage(message)
      }
    })

    // Connect FastMCP server to transport
    // Note: This is a simplified connection - in practice, we'd need to
    // properly implement the MCP transport protocol
  }

  /**
   * Add a tool to the server with compatibility validation
   */
  addTool = (definition: any) => {
    // Validate tool definition for compatibility
    assertValidToolDefinition(definition)
    return this.fastmcp.addTool(definition)
  }

  /**
   * Add a resource to the server with compatibility validation
   */
  addResource = (definition: any) => {
    // Validate resource definition for compatibility
    assertValidResourceDefinition(definition)
    return this.fastmcp.addResource(definition)
  }

  /**
   * Add a resource template to the server
   */
  addResourceTemplate = this.fastmcp.addResourceTemplate.bind(this.fastmcp)

  /**
   * Add a prompt to the server with compatibility validation
   */
  addPrompt = (definition: any) => {
    // Validate prompt definition for compatibility
    assertValidPromptDefinition(definition)
    return this.fastmcp.addPrompt(definition)
  }

  /**
   * Get embedded resource
   */
  embedded = this.fastmcp.embedded.bind(this.fastmcp)

  /**
   * Create Workers fetch handler
   */
  toWorkerHandler(): (request: Request, env?: any, ctx?: ExecutionContext) => Promise<Response> {
    return async (request: Request, env?: any, _ctx?: ExecutionContext) => {
      const url = new URL(request.url)

      // Handle health check endpoint
      if (this.options.health?.enabled && url.pathname === this.options.health.path) {
        return new Response(this.options.health.message || "OK", {
          status: this.options.health.status || 200,
          headers: { "Content-Type": "text/plain" },
        })
      }

      // Handle OAuth discovery endpoints
      if (this.options.oauth?.enabled) {
        if (url.pathname === "/.well-known/oauth-authorization-server") {
          return this.handleOAuthAuthorizationServer()
        }

        if (url.pathname === "/.well-known/oauth-protected-resource") {
          return this.handleOAuthProtectedResource()
        }
      }

      // Handle MCP requests through transport
      return await this.transport.handleRequest(request, env)
    }
  }

  /**
   * Handle OAuth authorization server discovery
   */
  private handleOAuthAuthorizationServer(): Response {
    if (!this.options.oauth?.authorizationServer) {
      return new Response("OAuth authorization server not configured", { status: 404 })
    }

    return new Response(JSON.stringify(this.options.oauth.authorizationServer), {
      headers: { "Content-Type": "application/json" },
    })
  }

  /**
   * Handle OAuth protected resource discovery
   */
  private handleOAuthProtectedResource(): Response {
    if (!this.options.oauth?.protectedResource) {
      return new Response("OAuth protected resource not configured", { status: 404 })
    }

    return new Response(JSON.stringify(this.options.oauth.protectedResource), {
      headers: { "Content-Type": "application/json" },
    })
  }

  /**
   * Start the server (for compatibility - not needed in Workers)
   */
  async start(): Promise<void> {
    console.log(`Workers FastMCP server "${this.options.name}" v${this.options.version} ready`)
    console.log("Use toWorkerHandler() to get the Workers fetch handler")
  }

  /**
   * Stop the server (for compatibility - not needed in Workers)
   */
  async stop(): Promise<void> {
    this.transport.close()
  }

  /**
   * Get server information
   */
  get info() {
    return {
      name: this.options.name,
      version: this.options.version,
      description: this.options.description,
      runtime: "cloudflare-workers",
      capabilities: this.fastmcp.capabilities,
    }
  }
}

// Re-export content helpers for convenience
export { imageContent, audioContent }
export type { ImageContent, AudioContent }

// Re-export transport types
export type { WorkersTransportOptions }
export { WorkersTransport }

// Re-export compatibility utilities for advanced usage
export {
  checkFastMCPCompatibility,
  getCompatibilityReport,
  SUPPORTED_FASTMCP_VERSIONS,
} from "./compatibility/version-check.js"
