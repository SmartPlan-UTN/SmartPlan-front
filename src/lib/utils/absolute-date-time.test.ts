import { describe, expect, it } from "vitest";

import { formatAbsoluteDateTime } from "./absolute-date-time";

describe("formatAbsoluteDateTime", () => {
  it("formats an ISO timestamp in es-AR using the local time zone", () => {
    const localDate = new Date(2026, 8, 24, 14, 32);

    expect(formatAbsoluteDateTime(localDate.toISOString())).toBe(
      "24/09/2026 a las 14:32",
    );
  });
});
