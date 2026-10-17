import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GooglePlaceContext } from "./GooglePlaceContext";

describe("GooglePlaceContext", () => {
  it("shows the rating attributed to Google Maps", () => {
    render(
      <GooglePlaceContext
        rating={{ rating: 4.8, ratingCount: 1022, source: "google" }}
      />,
    );
    expect(screen.getByText(/4,8/)).toBeInTheDocument();
    expect(screen.getByText(/en Google Maps/)).toBeInTheDocument();
  });

  it("labels the price as the venue's reference, never as the activity price", () => {
    render(
      <GooglePlaceContext
        price={{
          min: 20000,
          max: 35000,
          currency: "ARS",
          level: null,
          source: "google",
        }}
      />,
    );
    expect(screen.getByText(/Referencia del lugar en Google Maps/)).toBeInTheDocument();
    expect(screen.getByText(/no de esta actividad/)).toBeInTheDocument();
  });

  it("renders nothing when Google returned neither rating nor price", () => {
    const { container } = render(<GooglePlaceContext rating={null} price={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not print an amount for a non-ARS range", () => {
    const { container } = render(
      <GooglePlaceContext
        price={{ min: 20, max: 40, currency: "USD", level: null, source: "google" }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
