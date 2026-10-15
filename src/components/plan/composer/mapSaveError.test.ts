import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";

import { mapSaveError } from "./mapSaveError";

function httpError(status: number, code?: string) {
  return new ApiError({
    message: "x",
    type: "HTTP",
    status,
    code: code ?? null,
  });
}

describe("mapSaveError", () => {
  it("keeps the draft message for network failures and unknown errors", () => {
    expect(mapSaveError(new Error("offline")).message).toMatch(
      /borrador sigue acá/,
    );
    expect(
      mapSaveError(new ApiError({ message: "x", type: "NETWORK" })).message,
    ).toMatch(/borrador sigue acá/);
    expect(mapSaveError(httpError(500)).step).toBeUndefined();
  });

  it("sends validation failures back to the idea step", () => {
    expect(mapSaveError(httpError(400))).toMatchObject({ step: 0 });
  });

  it("sends catalog and duplicate problems back to the route", () => {
    expect(mapSaveError(httpError(404, "ACTIVITY_NOT_FOUND"))).toMatchObject({
      step: 1,
    });
    expect(
      mapSaveError(httpError(400, "DUPLICATE_ACTIVITY_IN_PLAN")),
    ).toMatchObject({ step: 1 });
  });

  it("asks for a fresh request id when the old one was used with other data", () => {
    expect(
      mapSaveError(httpError(409, "PLAN_COMPOSER_REQUEST_REUSED")),
    ).toMatchObject({ newRequestId: true });
  });

  it("explains plans that can no longer be edited", () => {
    expect(
      mapSaveError(httpError(409, "PLAN_NOT_EDITABLE_IN_COMPOSER")).message,
    ).toMatch(/ya no se puede editar/);
  });
});
