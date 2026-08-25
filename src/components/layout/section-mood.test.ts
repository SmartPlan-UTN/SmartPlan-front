import { describe, expect, it } from "vitest";

import { moodForRoute } from "./section-mood";

describe("moodForRoute", () => {
  it("gives each section its own palette", () => {
    expect(moodForRoute("/plans")).toBe("gastronomia");
    expect(moodForRoute("/favorites")).toBe("cultural");
    expect(moodForRoute("/history")).toBe("nocturna");
    expect(moodForRoute("/explore")).toBe("idle");
    expect(moodForRoute("/login")).toBe("romantica");
    expect(moodForRoute("/signup")).toBe("romantica");
    expect(moodForRoute("/recover-password")).toBe("romantica");
  });

  it("keeps a section's palette on its nested routes", () => {
    expect(moodForRoute("/plans/12")).toBe("gastronomia");
    expect(moodForRoute("/plans/12/edit")).toBe("gastronomia");
    expect(moodForRoute("/plans/create")).toBe("gastronomia");
  });

  it("lets a longer prefix win over the section it sits under", () => {
    // `/explore` is idle, but the map underneath it is its own place.
    expect(moodForRoute("/explore/map")).toBe("aire_libre");
    expect(moodForRoute("/explore/7")).toBe("idle");
  });

  it("falls back to idle for anything unlisted", () => {
    expect(moodForRoute("/")).toBe("idle");
    expect(moodForRoute("/profile")).toBe("idle");
    expect(moodForRoute("/some/new/screen")).toBe("idle");
  });

  it("does not match a section on a route that merely starts with its name", () => {
    expect(moodForRoute("/planscape")).toBe("idle");
  });
});
