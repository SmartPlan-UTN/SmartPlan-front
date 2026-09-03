import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";

import { toPlanSelectionError } from "./planSelectionErrors";

function httpError(status: number, code?: string): ApiError {
  return new ApiError({ message: "x", type: "HTTP", status, code: code ?? null });
}

describe("toPlanSelectionError (CU22)", () => {
  it("maps 404 to a gone plan the surface should reconcile", () => {
    expect(toPlanSelectionError(httpError(404, "PLAN_NOT_FOUND"))).toEqual({
      kind: "not-found",
      message: "Este plan ya no está disponible.",
      recoverable: false,
      reconcile: true,
    });
  });

  it("maps 403 to an ownership error", () => {
    expect(toPlanSelectionError(httpError(403, "ACCESS_DENIED"))).toMatchObject({
      kind: "not-yours",
      reconcile: true,
      recoverable: false,
    });
  });

  it("maps PLAN_REQUEST_ALREADY_ADVANCED to a reconcilable state change", () => {
    expect(
      toPlanSelectionError(httpError(409, "PLAN_REQUEST_ALREADY_ADVANCED")),
    ).toMatchObject({ kind: "request-advanced", reconcile: true });
  });

  it("maps a network error to a retryable failure", () => {
    const error = new ApiError({ message: "sin red", type: "NETWORK" });
    expect(toPlanSelectionError(error)).toMatchObject({
      kind: "network",
      recoverable: true,
      reconcile: false,
    });
  });

  it("falls back to a retryable unknown error", () => {
    expect(toPlanSelectionError(new Error("boom"))).toMatchObject({
      kind: "unknown",
      recoverable: true,
      reconcile: false,
    });
  });
});
