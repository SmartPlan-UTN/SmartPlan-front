import {
  AxiosError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient, isRetriableAfterRefresh, isSessionInvalidating } from "./client";
import { ApiError } from "./errors";
import { refreshSessionOnce, setSessionRefresher } from "./session-refresher";

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

describe("isRetriableAfterRefresh", () => {
  const expired = makeError(401, "INVALID_TOKEN");

  it("retries an authenticated request whose access token expired", () => {
    expect(isRetriableAfterRefresh(expired, "/users/me", undefined)).toBe(true);
    expect(isRetriableAfterRefresh(expired, "/sessions/me", undefined)).toBe(true);
    expect(isRetriableAfterRefresh(expired, "/users/me/password", undefined)).toBe(
      true,
    );
  });

  it("does not retry the session-establishing endpoints", () => {
    expect(isRetriableAfterRefresh(expired, "/sessions/refresh", undefined)).toBe(
      false,
    );
    expect(isRetriableAfterRefresh(expired, "/sessions", undefined)).toBe(false);
    expect(isRetriableAfterRefresh(expired, "/users", undefined)).toBe(false);
    expect(isRetriableAfterRefresh(expired, "/password-recoveries", undefined)).toBe(
      false,
    );
  });

  it("does not retry a request that was already replayed once", () => {
    expect(isRetriableAfterRefresh(expired, "/users/me", true)).toBe(false);
  });

  it("does not retry errors that are not session-invalidating", () => {
    expect(isRetriableAfterRefresh(makeError(500, null), "/users/me", undefined)).toBe(
      false,
    );
    expect(
      isRetriableAfterRefresh(
        makeError(401, "INVALID_CURRENT_PASSWORD"),
        "/users/me/password",
        undefined,
      ),
    ).toBe(false);
  });
});

describe("refreshSessionOnce", () => {
  afterEach(() => {
    setSessionRefresher(null);
  });

  it("is false when no refresher is registered", async () => {
    await expect(refreshSessionOnce()).resolves.toBe(false);
  });

  it("is true when the refresher succeeds", async () => {
    setSessionRefresher(() => Promise.resolve());

    await expect(refreshSessionOnce()).resolves.toBe(true);
  });

  it("is false when the refresher rejects, without propagating the error", async () => {
    setSessionRefresher(() => Promise.reject(new Error("revoked")));

    await expect(refreshSessionOnce()).resolves.toBe(false);
  });

  it("collapses concurrent callers onto a single refresh, so token rotation can't trip REFRESH_TOKEN_REUSED", async () => {
    const refresher = vi.fn(() => Promise.resolve());
    setSessionRefresher(refresher);

    const results = await Promise.all([
      refreshSessionOnce(),
      refreshSessionOnce(),
      refreshSessionOnce(),
    ]);

    expect(refresher).toHaveBeenCalledTimes(1);
    expect(results).toEqual([true, true, true]);
  });

  it("starts a new refresh once the previous one settled", async () => {
    const refresher = vi.fn(() => Promise.resolve());
    setSessionRefresher(refresher);

    await refreshSessionOnce();
    await refreshSessionOnce();

    expect(refresher).toHaveBeenCalledTimes(2);
  });
});

/**
 * Drives the real interceptors by swapping in a per-request adapter, so these
 * exercise the shipped refresh-and-replay path rather than a reimplementation
 * of it.
 */
describe("apiClient session refresh on 401", () => {
  function expiredToken(config: InternalAxiosRequestConfig): AxiosError {
    return new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, {}, {
      status: 401,
      statusText: "Unauthorized",
      data: { code: "INVALID_TOKEN", message: "The token is invalid or expired" },
      headers: {},
      config,
    });
  }

  function ok(config: InternalAxiosRequestConfig, data: unknown) {
    return { status: 200, statusText: "OK", data, headers: {}, config };
  }

  afterEach(() => {
    setSessionRefresher(null);
    vi.unstubAllEnvs();
  });

  function stubBaseUrl(): void {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001/api");
  }

  it("renews the session and replays the request, so an expired access token is invisible", async () => {
    stubBaseUrl();
    const refresher = vi.fn(() => Promise.resolve());
    setSessionRefresher(refresher);

    let attempts = 0;
    const adapter: AxiosAdapter = (config) => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(expiredToken(config))
        : Promise.resolve(ok(config, { id: 7 }));
    };

    await expect(apiClient.get("/users/me", { adapter })).resolves.toEqual({ id: 7 });
    expect(refresher).toHaveBeenCalledTimes(1);
    expect(attempts).toBe(2);
  });

  it("replays at most once, so a still-rejected token cannot loop forever", async () => {
    stubBaseUrl();
    const refresher = vi.fn(() => Promise.resolve());
    setSessionRefresher(refresher);

    let attempts = 0;
    const adapter: AxiosAdapter = (config) => {
      attempts += 1;
      return Promise.reject(expiredToken(config));
    };

    await expect(apiClient.get("/users/me", { adapter })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(attempts).toBe(2);
    expect(refresher).toHaveBeenCalledTimes(1);
  });

  it("does not try to renew the session from the refresh endpoint itself", async () => {
    stubBaseUrl();
    const refresher = vi.fn(() => Promise.resolve());
    setSessionRefresher(refresher);

    let attempts = 0;
    const adapter: AxiosAdapter = (config) => {
      attempts += 1;
      return Promise.reject(expiredToken(config));
    };

    await expect(
      apiClient.post("/sessions/refresh", undefined, { adapter }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(attempts).toBe(1);
    expect(refresher).not.toHaveBeenCalled();
  });

  it("rejects without renewing when there is no session to renew", async () => {
    stubBaseUrl();

    let attempts = 0;
    const adapter: AxiosAdapter = (config) => {
      attempts += 1;
      return Promise.reject(expiredToken(config));
    };

    await expect(apiClient.get("/users/me", { adapter })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(attempts).toBe(1);
  });
});
