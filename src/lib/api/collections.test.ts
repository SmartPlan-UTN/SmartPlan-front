import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./client";
import {
  addActivityToCollection,
  removeActivityFromCollection,
} from "./collections";

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("collections API activity membership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts the activity id to the selected collection (CU35)", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ activities: [] });

    await addActivityToCollection(7, 42);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/collections/7/activities",
      { idActivity: 42 },
    );
  });

  it("deletes only the selected activity membership (CU36)", async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);

    await removeActivityFromCollection(7, 42);

    expect(apiClient.delete).toHaveBeenCalledWith(
      "/collections/7/activities/42",
    );
  });
});
