import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./client";
import {
  getContentReport,
  listContentReports,
  reportContent,
  resolveContentReport,
} from "./contentReports";

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("content reports API (#156)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports content", async () => {
    await reportContent({
      contentType: "experience_photo",
      contentId: 8,
      reason: "other",
      detail: "Es una publicidad.",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/content-reports", {
      contentType: "experience_photo",
      contentId: 8,
      reason: "other",
      detail: "Es una publicidad.",
    });
  });

  it("uses the administrator's queue contract", async () => {
    await listContentReports({ type: "rating", page: 2, sortBy: "reportCount" });
    await getContentReport("experience_comment", 4);

    expect(apiClient.get).toHaveBeenCalledWith("/admin/content-reports", {
      params: { type: "rating", page: 2, sortBy: "reportCount" },
    });
    expect(apiClient.get).toHaveBeenCalledWith("/admin/content-reports/experience_comment/4");
  });

  it("keeps or removes reported content", async () => {
    await resolveContentReport("rating", 31, { decision: "keep" });
    await resolveContentReport("rating", 32, { decision: "remove", reason: "Insulta." });

    expect(apiClient.patch).toHaveBeenCalledWith("/admin/content-reports/rating/31", {
      decision: "keep",
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/admin/content-reports/rating/32", {
      decision: "remove",
      reason: "Insulta.",
    });
  });
});
