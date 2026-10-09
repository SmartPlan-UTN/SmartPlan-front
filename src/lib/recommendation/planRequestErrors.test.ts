import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";

import { surpriseGenerationErrorCopy } from "./planRequestErrors";

describe("surpriseGenerationErrorCopy", () => {
  it("maps NO_VALID_COMBINATIONS to the not-enough-activities copy", () => {
    expect(
      surpriseGenerationErrorCopy({ code: "NO_VALID_COMBINATIONS" }).title,
    ).toMatch(/no encontramos suficientes actividades cerca/i);
  });

  it("explains the active-request limit without offering a retry", () => {
    const copy = surpriseGenerationErrorCopy({ code: "TOO_MANY_ACTIVE_REQUESTS" });
    expect(copy.title).toMatch(/varios planes/i);
    expect(copy.actions).not.toContain("retry");
  });

  it("treats a network error as a connection problem", () => {
    const error = new ApiError({ message: "sin red", type: "NETWORK", status: null });
    expect(surpriseGenerationErrorCopy({ error }).title).toMatch(/conexión/i);
  });

  it("never leaks provider details for an unknown failure", () => {
    const copy = surpriseGenerationErrorCopy({ code: "GEMINI_TIMEOUT" });
    expect(copy.title).toBe("Ocurrió un error al generar el plan sorpresa.");
    expect(copy.body).not.toMatch(/gemini|maps/i);
  });

  it("keeps provider access failures safe and actionable", () => {
    const copy = surpriseGenerationErrorCopy({
      code: "GENERATION_PROVIDER_UNAVAILABLE",
    });
    expect(copy.title).toMatch(/error al generar el plan sorpresa/i);
    expect(copy.body).not.toMatch(/gemini|maps|permission_denied/i);
  });
});
