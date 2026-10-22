import { describe, expect, it } from "vitest";
import { stopScreening } from "./stops";
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
