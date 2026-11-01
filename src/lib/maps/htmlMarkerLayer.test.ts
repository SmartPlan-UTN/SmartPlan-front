import { describe, expect, it } from "vitest";

import { declutterOffsets } from "./htmlMarkerLayer";

describe("declutterOffsets", () => {
  it("leaves markers that do not touch where they are", () => {
    expect(
      declutterOffsets([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]),
    ).toEqual([
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
    ]);
  });

  it("spreads markers on the same spot into a ring, far enough not to overlap", () => {
    const points = [
      { x: 50, y: 50 },
      { x: 52, y: 51 },
      { x: 49, y: 53 },
    ];
    const placed = declutterOffsets(points).map(({ dx, dy }, index) => ({
      x: points[index].x + dx,
      y: points[index].y + dy,
    }));
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        expect(
          Math.hypot(placed[i].x - placed[j].x, placed[i].y - placed[j].y),
        ).toBeGreaterThanOrEqual(28);
      }
    }
    // The first one (stop order) sits at the top of the ring.
    expect(placed[0].y).toBeLessThan(placed[1].y);
  });

  it("keeps markers far apart where they are, even with a cluster beside them", () => {
    const offsets = declutterOffsets([
      { x: 0, y: 0 },
      { x: 4, y: 2 },
      { x: 300, y: 300 },
    ]);
    expect(offsets[2]).toEqual({ dx: 0, dy: 0 });
    expect(offsets[0]).not.toEqual({ dx: 0, dy: 0 });
  });
});
