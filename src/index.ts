/**
 * FastMCP for Cloudflare Workers
 * 
 * A Cloudflare Workers adapter for FastMCP that enables building
 * MCP servers that run on Cloudflare's edge network.
 */

// Main exports
export { WorkersFastMCP } from './WorkersFastMCP.js';
export type { WorkersServerOptions } from './WorkersFastMCP.js';

// Transport exports
export { WorkersTransport, createWorkerHandler } from './transports/WorkersTransport.js';
export type { WorkersTransportOptions } from './transports/WorkersTransport.js';

// Content helper exports
export { imageContent, audioContent } from './utils/content-helpers.js';
export type { ImageContent, AudioContent } from './utils/content-helpers.js';

// Runtime utilities
export {
  detectRuntime,
  isCloudflareWorkers,
  isNodeJS,
  assertWorkersRuntime,
  getRuntimeInfo
} from './runtime/detection.js';

export type { Runtime } from './runtime/detection.js';

// Polyfill exports (for advanced usage)
export {
  WorkersEventEmitter,
  readFile,
  timers,
  BufferPolyfill,
  processPolyfill,
  initializePolyfills,
  getEventEmitter
} from './runtime/polyfills.js';

// Response helpers
export { createJsonResponse, createErrorResponse, createCorsResponse, createHealthResponse } from './utils/response-helpers.js';

// Compatibility utilities
export { 
  checkFastMCPCompatibility, 
  assertFastMCPCompatibility,
  getCompatibilityReport,
  SUPPORTED_FASTMCP_VERSIONS 
} from './compatibility/version-check.js';

export {
  validateToolDefinition,
  validateResourceDefinition,
  validatePromptDefinition,
  validateServerOptions,
  validateFastMCPInstance,
  assertValidToolDefinition,
  assertValidResourceDefinition,
  assertValidPromptDefinition
} from './compatibility/interface-validation.js';