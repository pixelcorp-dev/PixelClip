export const SITE_NAME = "PixelClip";
export const COMPANY_NAME = "PixelDominion";
export const DEFAULT_SITE_URL = "http://localhost:3107";
export const HOSTED_APP_URL = DEFAULT_SITE_URL;
export const GITHUB_URL = "https://github.com/pixelcorp-dev/PixelClip";
/** The local MCP server's Streamable HTTP endpoint (legacy SSE clients use `/sse`). */
export const HOSTED_MCP_URL = "http://localhost:9100/mcp";

/** MCP endpoint shown in setup snippets; self-hosters set NEXT_PUBLIC_MCP_URL. */
export function getMcpUrl() {
  const value = process.env.NEXT_PUBLIC_MCP_URL?.trim();
  if (!value) return HOSTED_MCP_URL;
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return HOSTED_MCP_URL;
  }
}

export function getSiteUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}
