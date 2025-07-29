/**
 * Runtime environment detection utilities for Cloudflare Workers
 */

export type Runtime = "workers" | "node" | "unknown"

/**
 * Detect the current runtime environment
 */
export function detectRuntime(): Runtime {
  // Check for Cloudflare Workers environment
  if (typeof globalThis !== "undefined" && "caches" in globalThis && "cf" in (globalThis as any)) {
    return "workers"
  }

  // Check for specific Workers globals
  if (typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope) {
    return "workers"
  }

  // Check for Node.js environment
  if (typeof process !== "undefined" && process.versions && process.versions.node) {
    return "node"
  }

  return "unknown"
}

/**
 * Check if running in Cloudflare Workers
 */
export function isCloudflareWorkers(): boolean {
  return detectRuntime() === "workers"
}

/**
 * Check if running in Node.js
 */
export function isNodeJS(): boolean {
  return detectRuntime() === "node"
}

/**
 * Assert that we're running in Cloudflare Workers, throw if not
 */
export function assertWorkersRuntime(): void {
  if (!isCloudflareWorkers()) {
    throw new Error("This code must run in Cloudflare Workers environment. " + `Detected runtime: ${detectRuntime()}`)
  }
}

/**
 * Get runtime-specific information
 */
export function getRuntimeInfo() {
  const runtime = detectRuntime()

  return {
    runtime,
    isWorkers: runtime === "workers",
    isNode: runtime === "node",
    hasFileSystem: runtime === "node",
    hasWebAPIs: runtime === "workers" || typeof fetch !== "undefined",
    hasNodeAPIs: runtime === "node" || (typeof process !== "undefined" && process.versions),
  }
}
