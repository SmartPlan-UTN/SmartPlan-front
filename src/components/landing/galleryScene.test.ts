import { describe, expect, it } from "vitest";

import {
  GALLERY_TILES,
  getGalleryBeats,
  tileProgress,
} from "./galleryScene";

describe("gallery beats", () => {
  it("shows nothing while the hero is still untouched", () => {
    // The section is bridged up under the hero, so a slice of it is on
    // screen at scroll 0 — `enter` is already around 0.12 there. Anything
    // visible at that point is a smudge over a clean hero.
    expect(getGalleryBeats(0.12, 0).enter).toBe(0);
    expect(getGalleryBeats(0.12, 0).copy).toBe(0);
  });

  it("starts the lead photograph on the approach, not on the pin", () => {
    // `t` is still 0 in all of these — the section has not pinned. By
    // `enter = 0.62`, which is where the hero has finished fading out,
    // the photograph is essentially fully arrived: that is the dead
    // screen between the two sections, closed.
    expect(getGalleryBeats(0.5, 0).enter).toBeGreaterThan(0.4);
    expect(getGalleryBeats(0.62, 0).enter).toBeGreaterThan(0.9);
    expect(getGalleryBeats(0.66, 0).enter).toBe(1);
  });

  it("finishes the copy early and never takes it back down", () => {
    expect(getGalleryBeats(0.42, 0).copy).toBe(0);
    expect(getGalleryBeats(0.72, 0).copy).toBe(1);
    // Once the approach is complete the copy stays at full opacity for
    // every position of the pinned track. Text at a fraction of its
    // opacity while it is the thing being read is the defect this
    // section replaces.
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(getGalleryBeats(1, t).copy).toBe(1);
    }
  });

  it("reframes before it deploys, with an overlap", () => {
    const mid = getGalleryBeats(1, 0.51);
    expect(mid.shift).toBeGreaterThan(0.9);
    expect(mid.open).toBeGreaterThan(0);
    expect(getGalleryBeats(1, 0.94).open).toBe(1);
  });

  it("is monotonic across the track", () => {
    let previous = -1;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const { shift, open } = getGalleryBeats(1, t);
      const sum = shift + open;
      expect(sum).toBeGreaterThanOrEqual(previous);
      previous = sum;
    }
  });
});

describe("tile stagger", () => {
  it("gives every tile a full travel that still ends inside the beat", () => {
    for (const tile of GALLERY_TILES) {
      if (tile.role === "lead") continue;
      expect(tileProgress(tile.delay, tile.delay)).toBe(0);
      expect(tileProgress(1, tile.delay)).toBe(1);
    }
  });

  it("arrives as a sequence rather than as a block", () => {
    const at = (delay: number) => tileProgress(0.6, delay);
    const delays = GALLERY_TILES.filter((t) => t.role !== "lead").map(
      (t) => t.delay,
    );
    const progresses = delays.map(at);
    expect(new Set(progresses).size).toBe(progresses.length);
    expect(progresses).toEqual([...progresses].sort((a, b) => b - a));
  });
});

describe("composition", () => {
  it("keeps the copy column clear of every photograph", () => {
    // The copy sits at x 1..36, vertically centred (y 24..76). Nothing
    // may be laid out inside that band, or the headline ends up on a
    // photograph in the final frame.
    for (const tile of GALLERY_TILES) {
      const overlapsX = tile.frame.x < 36;
      const overlapsY = tile.frame.y < 76 && tile.frame.y + tile.frame.h > 24;
      expect(overlapsX && overlapsY).toBe(false);
    }
  });

  it("is one dominant photograph, one answer and three fragments", () => {
    const area = (id: string) => {
      const tile = GALLERY_TILES.find((t) => t.id === id);
      if (!tile) throw new Error(`missing tile ${id}`);
      return tile.frame.w * tile.frame.h;
    };
    const roles = GALLERY_TILES.map((t) => t.role);
    expect(roles.filter((r) => r === "lead")).toHaveLength(1);
    expect(roles.filter((r) => r === "second")).toHaveLength(1);
    expect(roles.filter((r) => r === "satellite")).toHaveLength(3);

    const lead = area("mesa");
    const second = area("cordillera");
    // Deliberately lopsided: five comparable rectangles would read as a
    // grid with its gutters removed.
    expect(lead).toBeGreaterThan(second * 6);
    for (const tile of GALLERY_TILES.filter((t) => t.role === "satellite")) {
      expect(tile.frame.w * tile.frame.h).toBeLessThan(second);
    }
  });

  it("never travels a tile outside the stage on its way in", () => {
    // The viewport clips, so a tile entering from beyond the stage's edge
    // is sliced on a hard straight line for its whole entrance — which is
    // exactly what the two right-margin tiles used to do. `from` is a
    // percentage of the tile itself, so the offset scales with its size.
    for (const tile of GALLERY_TILES) {
      if (tile.role === "lead") continue;
      const dx = (tile.from.x * tile.frame.w) / 100;
      const dy = (tile.from.y * tile.frame.h) / 100;
      expect(tile.frame.x + dx).toBeGreaterThanOrEqual(0);
      expect(tile.frame.x + tile.frame.w + dx).toBeLessThanOrEqual(100);
      expect(tile.frame.y + dy).toBeGreaterThanOrEqual(0);
      expect(tile.frame.y + tile.frame.h + dy).toBeLessThanOrEqual(100);
    }
  });

  it("labels every photograph except the lead, and varies the placement", () => {
    const placements = GALLERY_TILES.map((t) => t.label);
    expect(placements.filter((p) => p === "none")).toHaveLength(1);
    expect(GALLERY_TILES.find((t) => t.role === "lead")?.label).toBe("none");
    // Four identical badges over four rectangles is a row of cards.
    expect(new Set(placements.filter((p) => p !== "none")).size).toBe(4);
  });
});
