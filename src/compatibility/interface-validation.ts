/**
 * Interface validation utilities to ensure FastMCP API compatibility
 * These functions validate that the FastMCP objects match our expected interfaces
 */

/**
 * Validate a tool definition matches expected FastMCP interface
 */
export function validateToolDefinition(tool: any): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Required fields
  if (typeof tool.name !== "string") {
    issues.push("Tool name must be a string")
  }

  if (typeof tool.description !== "string") {
    issues.push("Tool description must be a string")
  }

  if (typeof tool.execute !== "function") {
    issues.push("Tool execute must be a function")
  }

  // Optional fields validation
  if (tool.parameters !== undefined) {
    // Parameters should be a schema object or undefined
    if (typeof tool.parameters !== "object" || tool.parameters === null) {
      issues.push("Tool parameters must be an object (schema) or undefined")
    }
  }

  if (tool.annotations !== undefined) {
    if (typeof tool.annotations !== "object" || tool.annotations === null) {
      issues.push("Tool annotations must be an object or undefined")
    } else {
      // Validate known annotation fields
      const validAnnotationFields = [
        "title",
        "readOnlyHint",
        "destructiveHint",
        "idempotentHint",
        "openWorldHint",
        "streamingHint",
      ]
      for (const [key, value] of Object.entries(tool.annotations)) {
        if (validAnnotationFields.includes(key)) {
          if (key === "title" && typeof value !== "string") {
            issues.push("Tool annotation title must be a string")
          } else if (key !== "title" && typeof value !== "boolean") {
            issues.push(`Tool annotation ${key} must be a boolean`)
          }
        }
      }
    }
  }

  if (tool.canAccess !== undefined && typeof tool.canAccess !== "function") {
    issues.push("Tool canAccess must be a function or undefined")
  }

  if (tool.timeoutMs !== undefined && typeof tool.timeoutMs !== "number") {
    issues.push("Tool timeoutMs must be a number or undefined")
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Validate a resource definition matches expected FastMCP interface
 */
export function validateResourceDefinition(resource: any): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Required fields
  if (typeof resource.uri !== "string") {
    issues.push("Resource uri must be a string")
  }

  if (typeof resource.name !== "string") {
    issues.push("Resource name must be a string")
  }

  if (typeof resource.load !== "function") {
    issues.push("Resource load must be a function")
  }

  // Optional fields
  if (resource.mimeType !== undefined && typeof resource.mimeType !== "string") {
    issues.push("Resource mimeType must be a string or undefined")
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Validate a prompt definition matches expected FastMCP interface
 */
export function validatePromptDefinition(prompt: any): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Required fields
  if (typeof prompt.name !== "string") {
    issues.push("Prompt name must be a string")
  }

  if (typeof prompt.load !== "function") {
    issues.push("Prompt load must be a function")
  }

  // Optional fields
  if (prompt.description !== undefined && typeof prompt.description !== "string") {
    issues.push("Prompt description must be a string or undefined")
  }

  if (prompt.arguments !== undefined) {
    if (!Array.isArray(prompt.arguments)) {
      issues.push("Prompt arguments must be an array or undefined")
    } else {
      // Validate argument structure
      prompt.arguments.forEach((arg: any, index: number) => {
        if (typeof arg !== "object" || arg === null) {
          issues.push(`Prompt argument ${index} must be an object`)
          return
        }

        if (typeof arg.name !== "string") {
          issues.push(`Prompt argument ${index} name must be a string`)
        }

        if (arg.description !== undefined && typeof arg.description !== "string") {
          issues.push(`Prompt argument ${index} description must be a string or undefined`)
        }

        if (arg.required !== undefined && typeof arg.required !== "boolean") {
          issues.push(`Prompt argument ${index} required must be a boolean or undefined`)
        }
      })
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Validate FastMCP server options interface
 */
export function validateServerOptions(options: any): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Required fields
  if (typeof options.name !== "string") {
    issues.push("Server options name must be a string")
  }

  if (typeof options.version !== "string") {
    issues.push("Server options version must be a string")
  }

  // Optional fields
  if (options.description !== undefined && typeof options.description !== "string") {
    issues.push("Server options description must be a string or undefined")
  }

  if (options.instructions !== undefined && typeof options.instructions !== "string") {
    issues.push("Server options instructions must be a string or undefined")
  }

  if (options.authenticate !== undefined && typeof options.authenticate !== "function") {
    issues.push("Server options authenticate must be a function or undefined")
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Validate that a FastMCP instance has expected methods and properties
 */
export function validateFastMCPInstance(instance: any): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  const expectedMethods = ["addTool", "addResource", "addResourceTemplate", "addPrompt", "start", "stop"]
  const expectedProperties = ["options", "sessions"]

  for (const method of expectedMethods) {
    if (typeof instance[method] !== "function") {
      issues.push(`FastMCP instance missing method: ${method}`)
    }
  }

  for (const prop of expectedProperties) {
    if (!(prop in instance)) {
      issues.push(`FastMCP instance missing property: ${prop}`)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Runtime validation helper that throws on validation failure
 */
export function assertValidToolDefinition(tool: any): void {
  const result = validateToolDefinition(tool)
  if (!result.valid) {
    throw new Error(`Invalid tool definition: ${result.issues.join(", ")}`)
  }
}

export function assertValidResourceDefinition(resource: any): void {
  const result = validateResourceDefinition(resource)
  if (!result.valid) {
    throw new Error(`Invalid resource definition: ${result.issues.join(", ")}`)
  }
}

export function assertValidPromptDefinition(prompt: any): void {
  const result = validatePromptDefinition(prompt)
  if (!result.valid) {
    throw new Error(`Invalid prompt definition: ${result.issues.join(", ")}`)
  }
}
