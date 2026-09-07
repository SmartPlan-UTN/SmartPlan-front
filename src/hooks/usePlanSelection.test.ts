import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { PlanSelectionResult } from "@/types";

import { usePlanSelection } from "./usePlanSelection";

const selectPlan = vi.hoisted(() => vi.fn());
const deselectPlan = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  selectPlan,
  deselectPlan,
}));

const RESULT: PlanSelectionResult = {
  id: 7,
  planRequestId: 3,
  status: { key: "selected", name: "Elegido" },
};
const GENERATED: PlanSelectionResult = {
  id: 7,
  planRequestId: 3,
  status: { key: "generated", name: "Generado" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePlanSelection (CU22)", () => {
  it("returns the backend result on success and goes idle", async () => {
    selectPlan.mockResolvedValue(RESULT);
    const { result } = renderHook(() => usePlanSelection());

    let resolved: unknown;
    await act(async () => {
      resolved = await result.current.select(7);
    });

    expect(selectPlan).toHaveBeenCalledWith(7);
    expect(resolved).toEqual({ ok: true, result: RESULT });
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("ignores an overlapping call while one is in flight", async () => {
    let release!: (value: PlanSelectionResult) => void;
    selectPlan.mockReturnValue(
      new Promise<PlanSelectionResult>((resolve) => {
        release = resolve;
      }),
    );
    const { result } = renderHook(() => usePlanSelection());

    let first!: Promise<unknown>;
    let second: unknown;
    act(() => {
      first = result.current.select(7);
    });
    await act(async () => {
      second = await result.current.select(7);
    });

    expect(second).toBeNull();
    expect(selectPlan).toHaveBeenCalledTimes(1);

    await act(async () => {
      release(RESULT);
      await first;
    });
  });

  it("exposes a typed error on failure", async () => {
    selectPlan.mockRejectedValue(
      new ApiError({
        message: "x",
        type: "HTTP",
        status: 409,
        code: "PLAN_REQUEST_ALREADY_ADVANCED",
      }),
    );
    const { result } = renderHook(() => usePlanSelection());

    await act(async () => {
      await result.current.select(7);
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toMatchObject({
      kind: "request-advanced",
      reconcile: true,
    });
  });

  it("deselect calls the DELETE and shares the in-flight guard with select", async () => {
    deselectPlan.mockResolvedValue(GENERATED);
    selectPlan.mockResolvedValue(RESULT);
    const { result } = renderHook(() => usePlanSelection());

    let out: unknown;
    await act(async () => {
      out = await result.current.deselect(7);
    });
    expect(deselectPlan).toHaveBeenCalledWith(7);
    expect(out).toEqual({ ok: true, result: GENERATED });

    // One in flight → the other direction is ignored.
    let hanging!: (v: PlanSelectionResult) => void;
    deselectPlan.mockReturnValue(
      new Promise<PlanSelectionResult>((r) => {
        hanging = r;
      }),
    );
    let ignored: unknown;
    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.deselect(7);
    });
    await act(async () => {
      ignored = await result.current.select(7);
    });
    expect(ignored).toBeNull();
    await act(async () => {
      hanging(GENERATED);
      await pending;
    });
  });
});
