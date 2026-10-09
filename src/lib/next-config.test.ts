import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("next.config redirects (#130)", () => {
  it("sends the old Historial route to Mis salidas before rendering", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toContainEqual({
      source: "/history",
      destination: "/outings",
      permanent: false,
    });
  });
});
