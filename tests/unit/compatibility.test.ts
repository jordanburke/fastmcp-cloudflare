/**
 * Compatibility tests to ensure FastMCP integration works correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FastMCP } from 'fastmcp';
import { 
  checkFastMCPCompatibility, 
  assertFastMCPCompatibility,
  getCompatibilityReport,
  SUPPORTED_FASTMCP_VERSIONS 
} from '../../src/compatibility/version-check.js';
import {
  validateToolDefinition,
  validateResourceDefinition,
  validatePromptDefinition,
  validateServerOptions,
  validateFastMCPInstance
} from '../../src/compatibility/interface-validation.js';

describe('FastMCP Compatibility', () => {
  describe('Version Checking', () => {
    it('should detect FastMCP is available', () => {
      expect(FastMCP).toBeDefined();
      expect(typeof FastMCP).toBe('function');
    });

    it('should pass compatibility check', () => {
      const result = checkFastMCPCompatibility();
      
      // Should not have critical issues that break compatibility
      const criticalIssues = result.issues.filter(issue => 
        issue.includes('not found') || 
        issue.includes('missing') ||
        issue.includes('Cannot create')
      );
      
      expect(criticalIssues).toHaveLength(0);
    });

    it('should not throw on compatibility assertion', () => {
      expect(() => {
        assertFastMCPCompatibility();
      }).not.toThrow();
    });

    it('should provide comprehensive compatibility report', () => {
      const report = getCompatibilityReport();
      
      expect(report).toHaveProperty('compatible');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('supportedVersions');
      expect(report).toHaveProperty('timestamp');
      expect(report.supportedVersions).toEqual(SUPPORTED_FASTMCP_VERSIONS);
    });
  });

  describe('FastMCP Instance Creation', () => {
    it('should create FastMCP instance successfully', () => {
      expect(() => {
        const server = new FastMCP({
          name: 'Test Server',
          version: '1.0.0',
        });
        expect(server).toBeDefined();
      }).not.toThrow();
    });

    it('should validate FastMCP instance has expected interface', () => {
      const server = new FastMCP({
        name: 'Test Server',
        version: '1.0.0',
      });

      const result = validateFastMCPInstance(server);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should have all expected methods', () => {
      const server = new FastMCP({
        name: 'Test Server',
        version: '1.0.0',
      });

      expect(typeof server.addTool).toBe('function');
      expect(typeof server.addResource).toBe('function');
      expect(typeof server.addResourceTemplate).toBe('function');
      expect(typeof server.addPrompt).toBe('function');
      expect(Array.isArray(server.sessions)).toBe(true);
      expect(typeof server.start).toBe('function');
      expect(typeof server.stop).toBe('function');
    });

    it('should have expected properties', () => {
      const server = new FastMCP({
        name: 'Test Server',
        version: '1.0.0',
      });

      expect(server).toHaveProperty('options');
      expect(server.options).toHaveProperty('name', 'Test Server');
      expect(server.options).toHaveProperty('version', '1.0.0');
    });
  });

  describe('Interface Validation', () => {
    describe('Tool Definition Validation', () => {
      it('should validate correct tool definition', () => {
        const validTool = {
          name: 'test_tool',
          description: 'A test tool',
          execute: async () => 'result',
        };

        const result = validateToolDefinition(validTool);
        expect(result.valid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should reject invalid tool definition', () => {
        const invalidTool = {
          name: 123, // Should be string
          description: 'A test tool',
          // Missing execute function
        };

        const result = validateToolDefinition(invalidTool);
        expect(result.valid).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
      });

      it('should validate tool with annotations', () => {
        const toolWithAnnotations = {
          name: 'annotated_tool',
          description: 'Tool with annotations',
          execute: async () => 'result',
          annotations: {
            title: 'My Tool',
            readOnlyHint: true,
            openWorldHint: false,
          },
        };

        const result = validateToolDefinition(toolWithAnnotations);
        expect(result.valid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });
    });

    describe('Resource Definition Validation', () => {
      it('should validate correct resource definition', () => {
        const validResource = {
          uri: 'test://resource',
          name: 'Test Resource',
          load: async () => ({ text: 'content' }),
          mimeType: 'text/plain',
        };

        const result = validateResourceDefinition(validResource);
        expect(result.valid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should reject invalid resource definition', () => {
        const invalidResource = {
          uri: 123, // Should be string
          name: 'Test Resource',
          // Missing load function
        };

        const result = validateResourceDefinition(invalidResource);
        expect(result.valid).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
      });
    });

    describe('Prompt Definition Validation', () => {
      it('should validate correct prompt definition', () => {
        const validPrompt = {
          name: 'test_prompt',
          description: 'A test prompt',
          load: async () => 'prompt content',
          arguments: [
            {
              name: 'input',
              description: 'Input parameter',
              required: true,
            },
          ],
        };

        const result = validatePromptDefinition(validPrompt);
        expect(result.valid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should reject invalid prompt definition', () => {
        const invalidPrompt = {
          name: 123, // Should be string
          // Missing load function
          arguments: 'not an array', // Should be array
        };

        const result = validatePromptDefinition(invalidPrompt);
        expect(result.valid).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
      });
    });

    describe('Server Options Validation', () => {
      it('should validate correct server options', () => {
        const validOptions = {
          name: 'Test Server',
          version: '1.0.0',
          description: 'A test server',
          instructions: 'Test instructions',
        };

        const result = validateServerOptions(validOptions);
        expect(result.valid).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should reject invalid server options', () => {
        const invalidOptions = {
          name: 123, // Should be string
          version: null, // Should be string
        };

        const result = validateServerOptions(invalidOptions);
        expect(result.valid).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration with FastMCP', () => {
    let server: FastMCP;

    beforeEach(() => {
      server = new FastMCP({
        name: 'Integration Test Server',
        version: '1.0.0',
      });
    });

    it('should add tools without errors', () => {
      expect(() => {
        server.addTool({
          name: 'integration_test',
          description: 'Integration test tool',
          execute: async () => 'test result',
        });
      }).not.toThrow();
    });

    it('should add resources without errors', () => {
      expect(() => {
        server.addResource({
          uri: 'test://integration',
          name: 'Integration Test Resource',
          load: async () => ({ text: 'test content' }),
        });
      }).not.toThrow();
    });

    it('should add prompts without errors', () => {
      expect(() => {
        server.addPrompt({
          name: 'integration_test_prompt',
          description: 'Integration test prompt',
          load: async () => 'test prompt',
        });
      }).not.toThrow();
    });

    it('should have sessions property for session management', () => {
      // The sessions property should be available for managing client sessions
      expect(Array.isArray(server.sessions)).toBe(true);
      
      // Should be an empty array initially
      expect(server.sessions).toHaveLength(0);
    });
  });
});