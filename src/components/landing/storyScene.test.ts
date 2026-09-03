import { describe, expect, it } from "vitest";

import { STORY } from "./landingContent";
import {
  CAPTION_H,
  STORY_MOMENTS,
  STORY_WORDS,
  getStoryBeats,
  momentProgress,
  routePath,
} from "./storyScene";

/** Samples the pinned track finely enough to catch a window that has been
 * nudged past one of the scene's guarantees. */
const TRACK = Array.from({ length: 201 }, (_, i) => i / 200);

/** The column the copy and the payoff share, kept clear of everything else.
 * Same reservation the inspiration scene makes. */
const COPY_COLUMN = { x: 40, top: 24, bottom: 76 };

const overlaps = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** A caption's box, from its top-left anchor. Width is generous on purpose:
 * the test should fail before a real caption gets close to a photograph. */
const captionBox = (moment: (typeof STORY_MOMENTS)[number]) => ({
  x: moment.anchor.x,
  y: moment.anchor.y,
  w: 20,
  h: CAPTION_H,
});

describe("story scene data", () => {
  it("carries eight intentions, three of which become the recorrido", () => {
    expect(STORY_WORDS).toHaveLength(8);
    expect(new Set(STORY_WORDS.map((word) => word.label)).size).toBe(8);

    const keeps = STORY_WORDS.filter((word) => word.keeps !== undefined);
    expect(keeps).toHaveLength(3);
    expect(keeps.map((word) => word.keeps).sort()).toEqual(
      STORY.stops.map((stop) => stop.id).sort(),
    );
  });

  /** A survivor is resolved in place, never faded out and re-drawn, so it
   * has nowhere to drift to. Only the five that lose do. */
  it("gives a drift to the words that lose, and to no others", () => {
    for (const word of STORY_WORDS) {
      if (word.keeps === undefined) expect(word.drift).toBeDefined();
      else expect(word.drift).toBeUndefined();
    }
  });

  it("keeps every word, frame and anchor inside the stage", () => {
    for (const word of STORY_WORDS) {
      expect(word.home.x).toBeGreaterThanOrEqual(0);
      expect(word.home.x).toBeLessThanOrEqual(100);
      expect(word.home.y).toBeGreaterThanOrEqual(0);
      expect(word.home.y).toBeLessThanOrEqual(100);
    }

    for (const moment of STORY_MOMENTS) {
      const { x, y, w, h } = moment.frame;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(100);
      expect(y + h).toBeLessThanOrEqual(100);
      expect(moment.anchor.y + CAPTION_H).toBeLessThanOrEqual(100);
    }
  });

  it("keeps every drifting word inside the stage", () => {
    for (const word of STORY_WORDS) {
      if (!word.drift) continue;
      expect(word.home.x + word.drift.x).toBeGreaterThan(2);
      expect(word.home.x + word.drift.x).toBeLessThan(98);
      expect(word.home.y + word.drift.y).toBeGreaterThan(2);
      expect(word.home.y + word.drift.y).toBeLessThan(98);
    }
  });

  /** A caption sitting on a photograph is how the first pass shipped. */
  it("lands no caption on any photograph", () => {
    for (const caption of STORY_MOMENTS) {
      for (const frame of STORY_MOMENTS) {
        expect(overlaps(captionBox(caption), frame.frame)).toBe(false);
      }
    }
  });

  it("keeps the left column clear for the copy and the payoff", () => {
    for (const moment of STORY_MOMENTS) {
      expect(moment.anchor.x).toBeGreaterThanOrEqual(COPY_COLUMN.x);
      expect(moment.frame.x).toBeGreaterThanOrEqual(COPY_COLUMN.x);
    }
    // Loose words may use the strips above and below the copy, never the
    // column itself.
    for (const word of STORY_WORDS) {
      const insideColumn =
        word.home.x < COPY_COLUMN.x &&
        word.home.y > COPY_COLUMN.top &&
        word.home.y < COPY_COLUMN.bottom;
      expect(insideColumn).toBe(false);
    }
  });

  it("orders the moments along the thread, one per stop", () => {
    expect(STORY_MOMENTS.map((moment) => moment.id)).toEqual(
      STORY.stops.map((stop) => stop.id),
    );
    const positions = STORY_MOMENTS.map((moment) => moment.at);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(Math.max(...positions)).toBeLessThanOrEqual(0.8);
  });
});

describe("route path", () => {
  /** Every coordinate pair in the `d`, in order. */
  const points = (d: string) => {
    const n = (d.match(/[\d.]+/g) ?? []).map(Number);
    return Array.from({ length: n.length / 2 }, (_, i) => [n[i * 2], n[i * 2 + 1]]);
  };

  /**
   * Authored in the stage's pixels so the viewBox never has to stretch. The
   * stretched version needed a non-scaling stroke, which computed the dash
   * pattern in device space and drew the thread as fragments.
   */
  it("scales with the stage and stays inside it", () => {
    for (const [w, h] of [
      [1280, 786],
      [942, 662],
      [1280, 955],
    ]) {
      const d = routePath(w, h);
      expect(d.startsWith("M ")).toBe(true);
      // one move plus two cubics: 1 + 3 + 3 coordinate pairs
      expect(points(d)).toHaveLength(7);
      for (const [x, y] of points(d)) {
        expect(x).toBeGreaterThan(0);
        expect(y).toBeGreaterThan(0);
        expect(x).toBeLessThanOrEqual(w);
        expect(y).toBeLessThanOrEqual(h);
      }
    }
  });

  it("runs through each frame centre, in order", () => {
    const d = routePath(1000, 1000);
    const p = points(d);
    // The move-to, and the end point of each cubic.
    const visited = [p[0], p[3], p[6]];
    const centres = STORY_MOMENTS.map((m) => [
      (m.frame.x + m.frame.w / 2) * 10,
      (m.frame.y + m.frame.h / 2) * 10,
    ]);

    for (const [i, point] of visited.entries()) {
      expect(Math.abs(point[0] - centres[i][0])).toBeLessThan(40);
      expect(Math.abs(point[1] - centres[i][1])).toBeLessThan(40);
    }
  });
});

describe("story beats", () => {
  it("stays inside 0..1 across both clocks", () => {
    for (const t of TRACK) {
      for (const enter of [0, 0.5, 1]) {
        for (const value of Object.values(getStoryBeats(enter, t))) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("advances monotonically along the track", () => {
    // `warm` is deliberately excluded: it rises and settles back.
    const keys = ["sort", "fade", "route", "payoff"] as const;
    for (const key of keys) {
      let previous = -1;
      for (const t of TRACK) {
        const value = getStoryBeats(1, t)[key];
        expect(value).toBeGreaterThanOrEqual(previous);
        previous = value;
      }
    }
  });

  /**
   * The thread's rule. Orange strokes drawn before the sort has been read
   * are not a route to anyone seeing the page for the first time — they read
   * as stray SVG. Nothing may be drawn until smartplan has visibly started
   * ordering.
   */
  it("draws no thread at all before the sort has been read", () => {
    for (const t of TRACK.filter((value) => value <= 0.42)) {
      expect(getStoryBeats(1, t).route).toBe(0);
    }
    expect(getStoryBeats(1, 1).route).toBe(1);
  });

  /** A photograph can never precede the line that explains it. */
  it("holds every moment until the thread reaches it", () => {
    for (const t of TRACK) {
      const { route } = getStoryBeats(1, t);
      for (const moment of STORY_MOMENTS) {
        const p = momentProgress(route, moment.at);
        if (route === 0) expect(p).toBe(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
    // And each one is finished by the end of the track.
    for (const moment of STORY_MOMENTS) {
      expect(momentProgress(1, moment.at)).toBe(1);
    }
  });

  /**
   * The headline and "El plan sí." occupy the same column, so they must
   * never be on screen together — the sentence finishes where it started.
   */
  it("never shows both halves of the headline at once", () => {
    for (const t of TRACK) {
      const { copy, payoff } = getStoryBeats(1, t);
      expect(Math.min(copy, payoff)).toBeLessThan(0.01);
    }
  });

  /**
   * The section stays cream. An earlier version darkened the whole page to
   * `--char`, which broke the continuity with the hero and the gallery; the
   * ground may now only warm a few degrees and must settle back near the
   * cream `HowItWorks` is painted on.
   */
  it("warms the ground and settles it back", () => {
    expect(getStoryBeats(1, 0).warm).toBe(0);
    expect(getStoryBeats(1, 0.66).warm).toBeCloseTo(1, 5);
    expect(getStoryBeats(1, 1).warm).toBeLessThan(0.5);
  });

  it("holds the copy back until the section is genuinely arriving", () => {
    expect(getStoryBeats(0.12, 0).copy).toBe(0);
    expect(getStoryBeats(1, 0).copy).toBe(1);
  });
});
