import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./client";
import { createMcpKey, listMcpKeys, listMcpTools, revokeMcpKey } from "./mcp";

vi.mock("./client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

describe("mcp api", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists keys and tools from the admin endpoints", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    await listMcpKeys();
    await listMcpTools();
    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/admin/mcp-keys");
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/admin/mcp-tools");
  });

  it("creates a key with its name", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ id: 1, key: "smp_mcp_x" });
    await expect(createMcpKey("bot")).resolves.toMatchObject({ key: "smp_mcp_x" });
    expect(apiClient.post).toHaveBeenCalledWith("/admin/mcp-keys", { name: "bot" });
  });

  it("revokes a key by id", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);
    await revokeMcpKey(4);
    expect(apiClient.delete).toHaveBeenCalledWith("/admin/mcp-keys/4");
  });
});
