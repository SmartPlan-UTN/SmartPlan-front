import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";

import {
  surpriseGenerationErrorCopy,
  surpriseLocationErrorCopy,
} from "./planRequestErrors";

describe("surpriseLocationErrorCopy", () => {
  it("asks for a location when there is no GPS and no preferred area", () => {
    const copy = surpriseLocationErrorCopy("no-location");
    expect(copy.title).toMatch(/necesitamos tu ubicación/i);
    expect(copy.actions).toContain("go-preferences");
  });

  it("points an unsupported browser straight to preferences", () => {
    const copy = surpriseLocationErrorCopy("unsupported");
    expect(copy.actions).toEqual(["go-preferences"]);
  });
});

describe("surpriseGenerationErrorCopy", () => {
  it("maps NO_LOCATION_AVAILABLE and NO_VALID_COMBINATIONS to the not-enough-activities copy", () => {
    for (const code of ["NO_LOCATION_AVAILABLE", "NO_VALID_COMBINATIONS"]) {
      expect(surpriseGenerationErrorCopy({ code }).title).toMatch(
        /no encontramos suficientes actividades cerca/i,
      );
    }
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
});
