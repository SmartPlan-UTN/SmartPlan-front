import { describe, expect, it } from "vitest";
import { isHomePlan, isHomeStop, stopCoordinates, stopHref, stopScreening } from "./stops";
import type { PlanItineraryItem } from "@/types/plans";

const screeningItem = (screening: Record<string, unknown>) =>
  ({
    stop: { estimateBasis: { screening } },
  }) as unknown as PlanItineraryItem;

describe("stopScreening", () => {
  it("reads the screening snapshot and safe booking links from a plan stop", () => {
    expect(
      stopScreening(
        screeningItem({
          movieTitle: "Whale Fall",
          startsAt: "2026-10-22T22:15:00-03:00",
          format: "2D",
          language: "Castellano",
          room: "Sala 4",
          observedAt: "2026-10-22T16:00:00-03:00",
          bookingUrl: "https://tickets.example/show/1",
        }),
      ),
    ).toMatchObject({
      movieTitle: "Whale Fall",
      format: "2D",
      language: "Castellano",
      room: "Sala 4",
      bookingUrl: "https://tickets.example/show/1",
    });
  });

  it("ignores malformed screening snapshots and unsafe URLs", () => {
    expect(stopScreening(screeningItem({ movieTitle: "Whale Fall" }))).toBeNull();
    expect(
      stopScreening(
        screeningItem({
          movieTitle: "Whale Fall",
          startsAt: "2026-10-22T22:15:00-03:00",
          bookingUrl: "http://tickets.example/show/1",
        }),
      )?.bookingUrl,
    ).toBeNull();
  });
});


it.each([{ kind: "home" }, { atHome: true }])("never exposes map coordinates for a unified home stop: %j", (home) => {
  const item = {
    activity: null,
    stop: { place: { latitude: -32.9, longitude: -68.8, ...home } },
  } as PlanItineraryItem;
  expect(isHomeStop(item)).toBe(true);
  expect(stopCoordinates(item)).toBeNull();
});


it("classifies only nonempty, entirely home itineraries as home plans", () => {
  const home = { activity: null, stop: { place: { kind: "home" } } } as PlanItineraryItem;
  const outside = { activity: null, stop: { place: { kind: "park" } } } as PlanItineraryItem;
  expect(isHomePlan({ details: [] })).toBe(false);
  expect(isHomePlan({ details: [home, home] })).toBe(true);
  expect(isHomePlan({ details: [home, outside] })).toBe(false);
});


it("does not link a virtual home without an activity to a physical place page", () => {
  const home = { activity: null, stop: { place: { id: 7, kind: "home" } } } as PlanItineraryItem;
  expect(stopHref(home)).toBeNull();
  expect(stopHref({ ...home, activity: { id: 9 } } as PlanItineraryItem)).toBe("/explore/9");
});
