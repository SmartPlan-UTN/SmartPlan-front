import type { CreatedMcpKey, McpKey, McpTool } from '@/types';
import { apiClient } from './client';

/** Lists the MCP API keys (admin). */
export async function listMcpKeys(): Promise<McpKey[]> {
  return apiClient.get<McpKey[]>('/admin/mcp-keys');
}

/** Generates a key for a bot. The returned `key` is shown only once. */
export async function createMcpKey(name: string): Promise<CreatedMcpKey> {
  return apiClient.post<CreatedMcpKey>('/admin/mcp-keys', { name });
}

/** Revokes a key: from then on the MCP server rejects it. */
export async function revokeMcpKey(id: number): Promise<void> {
  await apiClient.delete<void>(`/admin/mcp-keys/${id}`);
}

/** Lists the tools the MCP server exposes, with their input schema. */
export async function listMcpTools(): Promise<McpTool[]> {
  return apiClient.get<McpTool[]>('/admin/mcp-tools');
}
