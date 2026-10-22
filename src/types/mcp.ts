/**
 * MCP server administration types. They match the DTOs in SmartPlan-back
 * (`src/mcp/dto/mcp-key.dto.ts`, PR SmartPlan-back#148).
 */

/** An MCP API key as listed: never carries the key itself. */
export interface McpKey {
  id: number;
  name: string;
  /** First characters of the key, to tell keys apart. */
  prefix: string;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/** Returned only once by `POST /admin/mcp-keys`. */
export interface CreatedMcpKey extends McpKey {
  key: string;
}

/** Minimal JSON Schema (draft-07) shape used to describe tool parameters. */
export interface McpJsonSchema {
  type?: string | string[];
  description?: string;
  properties?: Record<string, McpJsonSchema>;
  required?: string[];
  items?: McpJsonSchema;
  enum?: unknown[];
  anyOf?: McpJsonSchema[];
  oneOf?: McpJsonSchema[];
  format?: string;
  [keyword: string]: unknown;
}

/** A tool exposed by the MCP server (`GET /admin/mcp-tools`). */
export interface McpTool {
  name: string;
  description: string | null;
  inputSchema: McpJsonSchema;
}
