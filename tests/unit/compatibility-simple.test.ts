/**
 * Simplified compatibility tests that don't rely on FastMCP import
 * These tests can serve as a fallback if package resolution fails
 */

import { describe, it, expect } from 'vitest';

describe('Basic Compatibility (Fallback)', () => {
  it('should have a working test environment', () => {
    expect(true).toBe(true);
  });

  it('should be able to import project modules', async () => {
    // Test that we can import our own modules
    const { WorkersFastMCP } = await import('../../src/index.js');
    expect(WorkersFastMCP).toBeDefined();
    expect(typeof WorkersFastMCP).toBe('function');
  });

  it('should be able to import WorkersFastMCP class', async () => {
    // This test doesn't rely on FastMCP being importable
    // It just tests our wrapper class can be imported
    const { WorkersFastMCP } = await import('../../src/index.js');
    expect(WorkersFastMCP).toBeDefined();
    expect(typeof WorkersFastMCP).toBe('function');
  });

  it('should have compatibility checking functions available', async () => {
    const versionCheck = await import('../../src/compatibility/version-check.js');
    expect(versionCheck.SUPPORTED_FASTMCP_VERSIONS).toBeDefined();
    expect(versionCheck.EXPECTED_FASTMCP_API).toBeDefined();
    expect(typeof versionCheck.checkFastMCPCompatibility).toBe('function');
    expect(typeof versionCheck.getCompatibilityReport).toBe('function');
  });

  it('should have interface validation functions available', async () => {
    const interfaceValidation = await import('../../src/compatibility/interface-validation.js');
    expect(typeof interfaceValidation.validateToolDefinition).toBe('function');
    expect(typeof interfaceValidation.validateResourceDefinition).toBe('function');
    expect(typeof interfaceValidation.validatePromptDefinition).toBe('function');
    expect(typeof interfaceValidation.validateFastMCPInstance).toBe('function');
  });
});