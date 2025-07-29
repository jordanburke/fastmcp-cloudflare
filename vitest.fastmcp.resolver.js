// Custom resolver for fastmcp package to handle its non-standard exports
export function resolveFastMCP() {
  return {
    name: 'resolve-fastmcp',
    resolveId(id) {
      if (id === 'fastmcp') {
        // Return the path to the actual FastMCP export file
        return {
          id: new URL('./node_modules/fastmcp/dist/FastMCP.js', import.meta.url).pathname,
          moduleSideEffects: false
        };
      }
      return null;
    }
  };
}