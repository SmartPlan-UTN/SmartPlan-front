import { describe, expect, it } from "vitest";

import { HOW, SHOWCASE } from "./landingContent";
import {
  HOW_OPTION_SLOTS,
  STEP_MARKER_ZONE,
  activeStep,
  getHowBeats,
  optionProgress,
} from "./howScene";

/** Samples the pinned track finely enough to catch a window nudged past one
 * of the scene's guarantees. */
const TRACK = Array.from({ length: 201 }, (_, i) => i / 200);

describe("how scene data", () => {
  it("carries two scene-only options and one real chosen plan", () => {
    expect(HOW.options).toHaveLength(2);
    expect(HOW_OPTION_SLOTS).toHaveLength(3);

    const chosenSlots = HOW_OPTION_SLOTS.filter((slot) => slot.chosen);
    expect(chosenSlots).toHaveLength(1);
    // The middle slot is the one that wins.
    expect(HOW_OPTION_SLOTS[1].chosen).toBe(true);

    // The chosen id resolves to a real showcase plan, and it leads the rail.
    const chosen = SHOWCASE.plans.find((plan) => plan.id === HOW.chosenId);
    expect(chosen).toBeDefined();
    expect(SHOWCASE.plans[0].id).toBe(HOW.chosenId);
  });

  it("keeps every signal a literal fragment of the phrase", () => {
    for (const signal of HOW.signals) {
      expect(HOW.phrase).toContain(signal);
    }
  });

  it("keeps every option frame inside the stage", () => {
    for (const { frame } of HOW_OPTION_SLOTS) {
      expect(frame.x).toBeGreaterThanOrEqual(0);
      expect(frame.y).toBeGreaterThanOrEqual(0);
      expect(frame.x + frame.w).toBeLessThanOrEqual(100);
      expect(frame.y + frame.h).toBeLessThanOrEqual(100);
    }
  });

  it("leaves the step marker's corner clear of every option", () => {
    for (const { frame } of HOW_OPTION_SLOTS) {
      const clearsCorner =
        frame.x > STEP_MARKER_ZONE.x || frame.y + frame.h < STEP_MARKER_ZONE.y;
      expect(clearsCorner).toBe(true);
    }
  });
});

describe("how beats", () => {
  it("stays inside 0..1 across both clocks", () => {
    for (const t of TRACK) {
      for (const enter of [0, 0.5, 1]) {
        for (const value of Object.values(getHowBeats(enter, t))) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("advances monotonically along the track", () => {
    const keys = [
      "emphasis",
      "type",
      "shrink",
      "options",
      "choose",
      "expand",
    ] as const;
    for (const key of keys) {
      let previous = -1;
      for (const t of TRACK) {
        const value = getHowBeats(1, t)[key];
        expect(value).toBeGreaterThanOrEqual(previous);
        previous = value;
      }
    }
  });

  it("finishes typing the phrase before the composer steps back", () => {
    expect(getHowBeats(1, 0.24).type).toBeCloseTo(1, 2);
    expect(getHowBeats(1, 0.24).shrink).toBe(0);
  });

  it("holds every option until the composer has stepped back", () => {
    for (const t of TRACK) {
      const { shrink, options } = getHowBeats(1, t);
      for (const slot of HOW_OPTION_SLOTS) {
        const p = optionProgress(options, slot.delay);
        // A card is never more than barely visible before the shrink starts.
        if (shrink === 0) expect(p).toBe(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
    for (const slot of HOW_OPTION_SLOTS) {
      expect(optionProgress(1, slot.delay)).toBe(1);
    }
  });

  it("keeps the headline off the track's peak so it never fights the options", () => {
    // Fully arrived on approach…
    expect(getHowBeats(1, 0).headline).toBeCloseTo(1, 2);
    // …and gone by the time the options are in.
    expect(getHowBeats(1, 0.8).headline).toBe(0);
  });

  it("holds the headline back until the section is genuinely arriving", () => {
    expect(getHowBeats(0.1, 0).headline).toBe(0);
    expect(getHowBeats(1, 0).headline).toBeGreaterThan(0.9);
  });
});

describe("active step", () => {
  it("changes exactly three times across the track, in order", () => {
    const steps = TRACK.map(activeStep);
    expect(steps[0]).toBe(0);
    expect(steps.at(-1)).toBe(3);

    let changes = 0;
    for (let i = 1; i < steps.length; i += 1) {
      if (steps[i] !== steps[i - 1]) {
        expect(steps[i]).toBe(steps[i - 1] + 1);
        changes += 1;
      }
    }
    expect(changes).toBe(3);
  });

  it("has a label for every step it can return", () => {
    for (const step of [0, 1, 2, 3] as const) {
      expect(HOW.steps[step]).toBeDefined();
      expect(HOW.steps[step].label.length).toBeGreaterThan(0);
    }
  });
});
