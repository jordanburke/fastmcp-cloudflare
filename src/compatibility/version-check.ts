/**
 * FastMCP compatibility checking utilities
 * Ensures the Workers adapter remains compatible with the FastMCP version
 */

import { FastMCP } from 'fastmcp';

/**
 * Supported FastMCP version ranges
 */
export const SUPPORTED_FASTMCP_VERSIONS = {
  minimum: '1.0.0',
  maximum: '2.0.0', // Exclusive - will need updating for v2
  tested: ['1.0.0'], // Specific versions we've tested against
};

/**
 * Expected FastMCP API surface that we depend on
 */
export const EXPECTED_FASTMCP_API = {
  // Core class and methods we use
  FastMCP: [
    'constructor',
    'addTool',
    'addResource', 
    'addResourceTemplate',
    'addPrompt',
    'embedded',
    'start',
    'stop',
    'server', // property
    'capabilities', // property
  ],
  
  // Tool definition interface
  ToolDefinition: [
    'name',
    'description', 
    'parameters',
    'execute',
    'annotations',
    'canAccess',
    'timeoutMs',
  ],
  
  // Expected exports we use
  exports: [
    'FastMCP',
    'UserError',
    'imageContent',
    'audioContent',
  ],
};

/**
 * Check if the current FastMCP version is supported
 */
export function checkFastMCPCompatibility(): {
  compatible: boolean;
  version?: string;
  issues: string[];
} {
  const issues: string[] = [];
  
  try {
    // Try to get version from package.json (if available)
    let version: string | undefined;
    
    try {
      // This will work in Node.js environments during build/test
      const packageJson = require('fastmcp/package.json');
      version = packageJson.version;
    } catch {
      // In Workers or if package.json not accessible, we can't get version
      // We'll rely on API surface checking
    }
    
    // Check version range if we have version info
    if (version) {
      if (!isVersionSupported(version)) {
        issues.push(`FastMCP version ${version} is not in supported range ${SUPPORTED_FASTMCP_VERSIONS.minimum} - ${SUPPORTED_FASTMCP_VERSIONS.maximum}`);
      }
      
      if (!SUPPORTED_FASTMCP_VERSIONS.tested.includes(version)) {
        issues.push(`FastMCP version ${version} has not been specifically tested with this adapter`);
      }
    }
    
    // Check API surface compatibility
    const apiIssues = checkAPICompatibility();
    issues.push(...apiIssues);
    
    return {
      compatible: issues.length === 0,
      version,
      issues,
    };
    
  } catch (error) {
    issues.push(`Failed to check FastMCP compatibility: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      compatible: false,
      issues,
    };
  }
}

/**
 * Check if a version string is within supported range
 */
function isVersionSupported(version: string): boolean {
  try {
    const [major, minor, patch] = version.split('.').map(Number);
    const [minMajor, minMinor, minPatch] = SUPPORTED_FASTMCP_VERSIONS.minimum.split('.').map(Number);
    const [maxMajor, maxMinor, maxPatch] = SUPPORTED_FASTMCP_VERSIONS.maximum.split('.').map(Number);
    
    // Check minimum version
    if (major < minMajor) return false;
    if (major === minMajor && minor < minMinor) return false;
    if (major === minMajor && minor === minMinor && patch < minPatch) return false;
    
    // Check maximum version (exclusive)
    if (major >= maxMajor) return false;
    if (major === maxMajor - 1 && minor >= maxMinor) return false;
    if (major === maxMajor - 1 && minor === maxMinor - 1 && patch >= maxPatch) return false;
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if expected API surface is available
 */
function checkAPICompatibility(): string[] {
  const issues: string[] = [];
  
  try {
    // Check FastMCP class exists and has expected methods
    if (typeof FastMCP !== 'function') {
      issues.push('FastMCP class not found or not a constructor');
      return issues; // Can't continue without the main class
    }
    
    // Check FastMCP prototype methods
    const fastmcpPrototype = FastMCP.prototype;
    for (const method of EXPECTED_FASTMCP_API.FastMCP) {
      if (method === 'constructor') continue; // Skip constructor check
      
      if (!(method in fastmcpPrototype) && !(method in FastMCP)) {
        issues.push(`FastMCP missing expected method/property: ${method}`);
      }
    }
    
    // Check that we can create an instance
    try {
      const testInstance = new FastMCP({
        name: 'compatibility-test',
        version: '0.0.0',
      });
      
      // Check instance methods
      const requiredMethods = ['addTool', 'addResource', 'addPrompt'];
      for (const method of requiredMethods) {
        if (typeof (testInstance as any)[method] !== 'function') {
          issues.push(`FastMCP instance missing method: ${method}`);
        }
      }
    } catch (error) {
      issues.push(`Cannot create FastMCP instance: ${error instanceof Error ? error.message : String(error)}`);
    }
    
  } catch (error) {
    issues.push(`API compatibility check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return issues;
}

/**
 * Runtime compatibility assertion - throws if incompatible
 */
export function assertFastMCPCompatibility(): void {
  const result = checkFastMCPCompatibility();
  
  if (!result.compatible) {
    const errorMessage = [
      'FastMCP compatibility check failed!',
      'Issues found:',
      ...result.issues.map(issue => `  - ${issue}`),
      '',
      'Please ensure you are using a compatible version of FastMCP.',
      `Supported versions: ${SUPPORTED_FASTMCP_VERSIONS.minimum} - ${SUPPORTED_FASTMCP_VERSIONS.maximum} (exclusive)`,
      `Tested versions: ${SUPPORTED_FASTMCP_VERSIONS.tested.join(', ')}`,
    ].join('\n');
    
    throw new Error(errorMessage);
  }
  
  // Log compatibility info in development
  if (result.version) {
    console.log(`✅ FastMCP v${result.version} compatibility verified`);
  } else {
    console.log('✅ FastMCP API compatibility verified (version unknown)');
  }
}

/**
 * Get compatibility report for debugging
 */
export function getCompatibilityReport(): {
  compatible: boolean;
  version?: string;
  issues: string[];
  supportedVersions: typeof SUPPORTED_FASTMCP_VERSIONS;
  timestamp: string;
} {
  const result = checkFastMCPCompatibility();
  
  return {
    ...result,
    supportedVersions: SUPPORTED_FASTMCP_VERSIONS,
    timestamp: new Date().toISOString(),
  };
}