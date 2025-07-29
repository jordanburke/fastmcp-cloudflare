/**
 * Response utility functions for Cloudflare Workers
 */

/**
 * Create a JSON response with proper headers
 */
export function createJsonResponse(
  data: any,
  options: {
    status?: number
    headers?: Record<string, string>
  } = {},
): Response {
  const { status = 200, headers = {} } = options

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  })
}

/**
 * Create an error response in MCP format
 */
export function createErrorResponse(
  error: {
    code: number
    message: string
    data?: any
  },
  options: {
    status?: number
    headers?: Record<string, string>
  } = {},
): Response {
  const { status = 500, headers = {} } = options

  return new Response(
    JSON.stringify({
      error: {
        code: error.code,
        message: error.message,
        ...(error.data && { data: error.data }),
      },
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    },
  )
}

/**
 * Create a CORS response
 */
export function createCorsResponse(
  request: Request,
  options: {
    origins?: string[]
    credentials?: boolean
    methods?: string[]
    headers?: string[]
  } = {},
): Response {
  const {
    origins = ["*"],
    credentials = false,
    methods = ["GET", "POST", "OPTIONS"],
    headers: allowedHeaders = ["Content-Type", "Authorization"],
  } = options

  const responseHeaders: Record<string, string> = {
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": allowedHeaders.join(", "),
  }

  const origin = request.headers.get("origin")

  if (origins.includes("*")) {
    responseHeaders["Access-Control-Allow-Origin"] = "*"
  } else if (origin && origins.includes(origin)) {
    responseHeaders["Access-Control-Allow-Origin"] = origin
  }

  if (credentials) {
    responseHeaders["Access-Control-Allow-Credentials"] = "true"
  }

  return new Response(null, {
    status: 204,
    headers: responseHeaders,
  })
}

/**
 * Create a health check response
 */
export function createHealthResponse(status: "ok" | "error" = "ok", data?: any): Response {
  const responseData = {
    status,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
  }

  return createJsonResponse(responseData, {
    status: status === "ok" ? 200 : 503,
  })
}
