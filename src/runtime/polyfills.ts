/**
 * Node.js API polyfills for Cloudflare Workers environment
 */

import { isCloudflareWorkers } from "./detection.js"

/**
 * Polyfill for Node.js EventEmitter in Workers environment
 */
export class WorkersEventEmitter {
  private events = new Map<string, (...args: any[]) => void>()

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(listener)
    return this
  }

  off(event: string, listener: (...args: any[]) => void): this {
    const listeners = this.events.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
    return this
  }

  once(event: string, listener: (...args: any[]) => void): this {
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper)
      listener.apply(this, args)
    }
    return this.on(event, onceWrapper)
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event)
    if (listeners && listeners.length > 0) {
      listeners.forEach((listener) => {
        try {
          listener.apply(this, args)
        } catch (error) {
          console.error("Error in event listener:", error)
        }
      })
      return true
    }
    return false
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
    return this
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length ?? 0
  }
}

/**
 * Polyfill for Node.js fs/promises readFile in Workers
 */
export const readFile = {
  async readFile(pathOrUrl: string): Promise<Buffer> {
    if (!isCloudflareWorkers()) {
      throw new Error("readFile polyfill only available in Workers environment")
    }

    // Only support URLs in Workers environment
    if (!pathOrUrl.startsWith("http://") && !pathOrUrl.startsWith("https://")) {
      throw new Error("File system access not available in Workers. Use URLs instead of file paths.")
    }

    try {
      const response = await fetch(pathOrUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${pathOrUrl}: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      throw new Error(`Failed to read file from URL: ${error instanceof Error ? error.message : String(error)}`)
    }
  },
}

/**
 * Polyfill for Node.js timers/promises
 */
export const timers = {
  setTimeout: (ms: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  },
}

/**
 * Buffer encoding type
 */
type BufferEncoding =
  | "ascii"
  | "utf8"
  | "utf-8"
  | "utf16le"
  | "ucs2"
  | "ucs-2"
  | "base64"
  | "base64url"
  | "latin1"
  | "binary"
  | "hex"

/**
 * Polyfill for Node.js Buffer (Workers has limited Buffer support)
 */
export const BufferPolyfill = {
  from(data: ArrayBuffer | string, encoding?: BufferEncoding): Buffer {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(data, encoding)
    }

    // Fallback implementation for environments without Buffer
    if (typeof data === "string") {
      const encoder = new TextEncoder()
      const uint8Array = encoder.encode(data)
      return uint8Array as unknown as Buffer
    } else {
      return new Uint8Array(data) as unknown as Buffer
    }
  },

  isBuffer(obj: any): obj is Buffer {
    return typeof Buffer !== "undefined" ? Buffer.isBuffer(obj) : false
  },
}

/**
 * Process polyfill for Workers environment
 */
export const processPolyfill = {
  env: {} as Record<string, string | undefined>,
  versions: { node: "20.0.0" }, // Fake Node.js version for compatibility

  // Initialize environment variables from Workers bindings if available
  init(env?: Record<string, any>) {
    if (env) {
      Object.assign(this.env, env)
    }
  },
}

/**
 * Initialize all polyfills for Workers environment
 */
export function initializePolyfills(env?: Record<string, any>): void {
  if (!isCloudflareWorkers()) {
    return // Don't polyfill in Node.js environment
  }

  // Initialize process.env with Workers environment
  processPolyfill.init(env)

  // Make polyfills available globally if needed
  if (typeof globalThis !== "undefined") {
    // Only add if not already present
    if (!globalThis.process) {
      ;(globalThis as any).process = processPolyfill
    }
  }
}

/**
 * Get appropriate EventEmitter class for current environment
 */
export function getEventEmitter(): typeof WorkersEventEmitter {
  if (isCloudflareWorkers()) {
    return WorkersEventEmitter
  }

  // Always use our polyfill for consistency in ESM environments
  return WorkersEventEmitter
}
