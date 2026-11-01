import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { outingCreation } from "@/test/fixtures/outings";
import type { OutingCreationResult } from "@/types";

import { usePlanSelection } from "./usePlanSelection";

const createOuting = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  createOuting,
}));

const RESULT = outingCreation();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePlanSelection (CU22, #130)", () => {
  it("creates the outing and returns it, then goes idle", async () => {
    createOuting.mockResolvedValue(RESULT);
    const { result } = renderHook(() => usePlanSelection());

    let resolved: unknown;
    await act(async () => {
      resolved = await result.current.choose(7);
    });

    expect(createOuting).toHaveBeenCalledWith(7);
    expect(resolved).toEqual({ ok: true, result: RESULT });
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("ignores an overlapping call while one is in flight", async () => {
    let release!: (value: OutingCreationResult) => void;
    createOuting.mockReturnValue(
      new Promise<OutingCreationResult>((resolve) => {
        release = resolve;
      }),
    );
    const { result } = renderHook(() => usePlanSelection());

    let first!: Promise<unknown>;
    let second: unknown;
    act(() => {
      first = result.current.choose(7);
    });
    await act(async () => {
      second = await result.current.choose(7);
    });

    expect(second).toBeNull();
    expect(createOuting).toHaveBeenCalledTimes(1);

    await act(async () => {
      release(RESULT);
      await first;
    });
  });

  it("exposes a typed error on failure", async () => {
    createOuting.mockRejectedValue(
      new ApiError({
        message: "x",
        type: "HTTP",
        status: 409,
        code: "PLAN_NOT_ACTIONABLE",
      }),
    );
    const { result } = renderHook(() => usePlanSelection());

    await act(async () => {
      await result.current.choose(7);
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatchObject({
      kind: "not-actionable",
      reconcile: true,
    });
  });

  it("has no way to undo: an outing is cancelled from Mis salidas", () => {
    const { result } = renderHook(() => usePlanSelection());

    expect(result.current).not.toHaveProperty("deselect");
  });
});
