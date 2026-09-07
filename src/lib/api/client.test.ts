import { describe, expect, it } from "vitest";

import { isSessionInvalidating } from "./client";
import { ApiError } from "./errors";

function makeError(status: number, code: string | null): ApiError {
  return new ApiError({
    message: "test error",
    type: "HTTP",
    status,
    code,
  });
}

describe("isSessionInvalidating", () => {
  it("is false for non-401 errors", () => {
    expect(isSessionInvalidating(makeError(500, null))).toBe(false);
    expect(isSessionInvalidating(makeError(403, "ACCESS_DENIED"))).toBe(false);
  });

  it("is true for a 401 that means the session/token is invalid", () => {
    expect(isSessionInvalidating(makeError(401, "INVALID_TOKEN"))).toBe(true);
    expect(isSessionInvalidating(makeError(401, "INVALID_SESSION"))).toBe(true);
    expect(isSessionInvalidating(makeError(401, "UNAUTHENTICATED"))).toBe(true);
    expect(isSessionInvalidating(makeError(401, null))).toBe(true);
  });

  it("is false for INVALID_CURRENT_PASSWORD (CU6/CU7): a valid session, wrong credential", () => {
    expect(isSessionInvalidating(makeError(401, "INVALID_CURRENT_PASSWORD"))).toBe(
      false,
    );
  });
});
