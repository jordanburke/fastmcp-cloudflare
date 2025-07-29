/**
 * FastMCP compatibility checking utilities
 * Ensures the Workers adapter remains compatible with the FastMCP version
 */

import { FastMCP } from "fastmcp"

/**
 * Supported FastMCP version ranges
 */
export const SUPPORTED_FASTMCP_VERSIONS = {
  minimum: "3.0.0",
  maximum: "4.0.0", // Exclusive - will need updating for v4
  tested: ["3.12.0"], // Specific versions we've tested against
}

/**
 * Expected FastMCP API surface that we depend on
 */
export const EXPECTED_FASTMCP_API = {
  // Core class and methods we use
  FastMCP: ["constructor", "addTool", "addResource", "addResourceTemplate", "addPrompt", "start", "stop"],

  // Tool definition interface
  ToolDefinition: ["name", "description", "parameters", "execute", "annotations", "canAccess", "timeoutMs"],

  // Expected exports we use
  exports: ["FastMCP", "UserError", "imageContent", "audioContent"],
}

/**
 * Check if the current FastMCP version is supported
 */
export function checkFastMCPCompatibility(): {
  compatible: boolean
  version?: string | undefined
  issues: string[]
} {
  const issues: string[] = []

  try {
    // Try to get version from package.json (if available)
    let version: string | undefined

    // In ESM environments, we cannot use require() to get the version
    // We'll rely on API surface checking instead

    // Check version range if we have version info
    if (version) {
      if (!isVersionSupported(version)) {
        issues.push(
          `FastMCP version ${version} is not in supported range ${SUPPORTED_FASTMCP_VERSIONS.minimum} - ${SUPPORTED_FASTMCP_VERSIONS.maximum}`,
        )
      }

      if (!SUPPORTED_FASTMCP_VERSIONS.tested.includes(version)) {
        issues.push(`FastMCP version ${version} has not been specifically tested with this adapter`)
      }
    }

    // Check API surface compatibility
    const apiIssues = checkAPICompatibility()
    issues.push(...apiIssues)

    return {
      compatible: issues.length === 0,
      version,
      issues,
    }
  } catch (error) {
    issues.push(`Failed to check FastMCP compatibility: ${error instanceof Error ? error.message : String(error)}`)

    return {
      compatible: false,
      issues,
    }
  }
}

/**
 * Check if a version string is within supported range
 */
function isVersionSupported(version: string): boolean {
  try {
    const versionParts = version.split(".").map(Number)
    const minParts = SUPPORTED_FASTMCP_VERSIONS.minimum.split(".").map(Number)
    const maxParts = SUPPORTED_FASTMCP_VERSIONS.maximum.split(".").map(Number)

    if (versionParts.length !== 3 || minParts.length !== 3 || maxParts.length !== 3) {
      return false
    }

    const [major, minor, patch] = versionParts
    const [minMajor, minMinor, minPatch] = minParts
    const [maxMajor, maxMinor, maxPatch] = maxParts

    // Check for NaN values
    if (
      [major, minor, patch, minMajor, minMinor, minPatch, maxMajor, maxMinor, maxPatch].some(
        (n) => n === undefined || isNaN(n),
      )
    ) {
      return false
    }

    // Type assertions since we've checked they're not undefined
    const [maj, min, pat] = [major!, minor!, patch!]
    const [minMaj, minMin, minPat] = [minMajor!, minMinor!, minPatch!]
    const [maxMaj, maxMin, maxPat] = [maxMajor!, maxMinor!, maxPatch!]

    // Check minimum version
    if (maj < minMaj) return false
    if (maj === minMaj && min < minMin) return false
    if (maj === minMaj && min === minMin && pat < minPat) return false

    // Check maximum version (exclusive)
    if (maj >= maxMaj) return false
    if (maj === maxMaj - 1 && min >= maxMin) return false
    if (maj === maxMaj - 1 && min === maxMin - 1 && pat >= maxPat) return false

    return true
  } catch {
    return false
  }
}

/**
 * Check if expected API surface is available
 */
function checkAPICompatibility(): string[] {
  const issues: string[] = []

  try {
    // Check FastMCP class exists and has expected methods
    if (typeof FastMCP !== "function") {
      issues.push("FastMCP class not found or not a constructor")
      return issues // Can't continue without the main class
    }

    // Check FastMCP prototype methods
    const fastmcpPrototype = FastMCP.prototype
    for (const method of EXPECTED_FASTMCP_API.FastMCP) {
      if (method === "constructor") continue // Skip constructor check

      if (!(method in fastmcpPrototype) && !(method in FastMCP)) {
        issues.push(`FastMCP missing expected method/property: ${method}`)
      }
    }

    // Check that we can create an instance
    try {
      const testInstance = new FastMCP({
        name: "compatibility-test",
        version: "0.0.0",
      })

      // Check instance methods
      const requiredMethods = ["addTool", "addResource", "addPrompt"]
      for (const method of requiredMethods) {
        if (typeof (testInstance as any)[method] !== "function") {
          issues.push(`FastMCP instance missing method: ${method}`)
        }
      }
    } catch (error) {
      issues.push(`Cannot create FastMCP instance: ${error instanceof Error ? error.message : String(error)}`)
    }
  } catch (error) {
    issues.push(`API compatibility check failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  return issues
}

/**
 * Runtime compatibility assertion - throws if incompatible
 */
export function assertFastMCPCompatibility(): void {
  const result = checkFastMCPCompatibility()

  if (!result.compatible) {
    const errorMessage = [
      "FastMCP compatibility check failed!",
      "Issues found:",
      ...result.issues.map((issue) => `  - ${issue}`),
      "",
      "Please ensure you are using a compatible version of FastMCP.",
      `Supported versions: ${SUPPORTED_FASTMCP_VERSIONS.minimum} - ${SUPPORTED_FASTMCP_VERSIONS.maximum} (exclusive)`,
      `Tested versions: ${SUPPORTED_FASTMCP_VERSIONS.tested.join(", ")}`,
    ].join("\n")

    throw new Error(errorMessage)
  }

  // Log compatibility info in development
  if (result.version) {
    console.log(`✅ FastMCP v${result.version} compatibility verified`)
  } else {
    console.log("✅ FastMCP API compatibility verified (version unknown)")
  }
}

/**
 * Get compatibility report for debugging
 */
export function getCompatibilityReport(): {
  compatible: boolean
  version?: string | undefined
  issues: string[]
  supportedVersions: typeof SUPPORTED_FASTMCP_VERSIONS
  timestamp: string
} {
  const result = checkFastMCPCompatibility()

  return {
    ...result,
    supportedVersions: SUPPORTED_FASTMCP_VERSIONS,
    timestamp: new Date().toISOString(),
  }
}
