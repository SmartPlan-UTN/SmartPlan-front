import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./client";
import { getActivityMapMarkers } from "./activities";

vi.mock("./client", () => ({ apiClient: { get: vi.fn() } }));

describe("getActivityMapMarkers", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: {} } as never);
  });

  it("rounds a Google Maps viewport to the 6 decimals the API accepts", async () => {
    await getActivityMapMarkers({
      north: -32.80268079745665,
      south: -32.976234212975754,
      east: -68.64564283447265,
      west: -69.04595716552734,
      limit: 100,
    } as never);

    const params = vi.mocked(apiClient.get).mock.calls[0][1]?.params as Record<
      string,
      number
    >;
    expect(params.north).toBe(-32.802681);
    expect(params.south).toBe(-32.976234);
    expect(params.east).toBe(-68.645643);
    expect(params.west).toBe(-69.045957);
    expect(params.limit).toBe(100);
  });
});
