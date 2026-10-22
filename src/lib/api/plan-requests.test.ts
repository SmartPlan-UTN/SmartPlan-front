import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());

vi.mock("./client", () => ({
  apiClient: { post, get: vi.fn() },
}));

import {
  createPlanRequest,
  createSurprisePlanRequest,
  refinePlanRequest,
} from "./plan-requests";

describe("plan request submission timeouts", () => {
  beforeEach(() => {
    post.mockReset().mockResolvedValue({ id: 1, statusKey: "pending" });
  });

  it("allows the backend generation deadline to return an accepted request", async () => {
    const timeout = { timeout: 40_000 };

    await createPlanRequest({ query: "una cena tranquila" });
    await createSurprisePlanRequest({});
    await refinePlanRequest(42, { planId: 7, action: "CHEAPER" });

    expect(post).toHaveBeenNthCalledWith(1, "/plan-requests", { query: "una cena tranquila" }, timeout);
    expect(post).toHaveBeenNthCalledWith(2, "/plan-requests/surprise", {}, timeout);
    expect(post).toHaveBeenNthCalledWith(3, "/plan-requests/42/refine", { planId: 7, action: "CHEAPER" }, timeout);
  });
});
