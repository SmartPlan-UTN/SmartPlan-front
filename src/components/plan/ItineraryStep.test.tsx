import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PlanItineraryItem } from "@/types";

import { ItineraryStep } from "./ItineraryStep";

function step(location: NonNullable<PlanItineraryItem["activity"]>["locations"][number]): PlanItineraryItem {
  return {
    id: 1,
    order: 1,
    estimatedCost: 0,
    estimatedDuration: 30,
    activity: {
      id: 9,
      name: "El impostor",
      description: "",
      estimatedCost: 0,
      estimatedDuration: 30,
      type: null,
      averageRating: 0,
      ratingCount: 0,
      categories: [],
      locations: [location],
    },
  } as PlanItineraryItem;
}

describe("ItineraryStep at the Hogar (#210)", () => {
  it("says where it happens without an address or a map link", () => {
    render(
      <ItineraryStep
        isFirst
        isLast
        detail={step({
          id: 2,
          atHome: true,
          latitude: -32.9,
          longitude: -68.8,
          notes: null,
          place: { id: 1, name: "En casa / donde estén", description: null, address: "Donde estén", kind: "home", department: null },
        })}
      />,
    );
    expect(screen.getByText("En casa / donde estén")).toBeInTheDocument();
    expect(screen.queryByText("Donde estén")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver en mapa/ })).not.toBeInTheDocument();
  });

  it("keeps the address and the map for a real place", () => {
    render(
      <ItineraryStep
        isFirst
        isLast
        detail={step({
          id: 2,
          latitude: -32.9,
          longitude: -68.8,
          notes: null,
          place: {
            id: 1,
            name: "Museo",
            description: null,
            address: "Calle 1",
            department: { id: 1, name: "Ciudad", city: { id: 1, name: "Mendoza", country: { id: 1, name: "Argentina" } } },
          },
        })}
      />,
    );
    expect(screen.getByText("Calle 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver en mapa/ })).toBeInTheDocument();
  });
});


it.each([true, false])("omits travel time for a leg to or from an unlocated home (destination home: %s)", (destinationHome) => {
  const stop = (home: boolean): PlanItineraryItem => ({
    id: home ? 1 : 2, order: 2, activity: null, estimatedCost: 0, estimatedDuration: 60,
    stop: {
      kind: "PLACE_ACTION", label: home ? "Truco" : "Café", action: null, actionLabel: null,
      activityId: null, startMinute: null, legTravelMinutes: 15,
      legDistanceMeters: null, estimateBasis: null,
      place: { id: 1, name: home ? "Hogar" : "Café", address: null,
        kind: home ? "home" : "cafe", atHome: home, kindLabel: null,
        latitude: null, longitude: null, googlePlaceId: null, departmentName: null },
    },
  });
  render(<ItineraryStep detail={stop(destinationHome)} previousDetail={stop(!destinationHome)} isFirst={false} isLast />);
  expect(screen.queryByText(/min desde la anterior/)).not.toBeInTheDocument();
});
