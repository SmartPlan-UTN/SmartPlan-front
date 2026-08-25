import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/lib/routes";

import MyPlansPage from "./page";

vi.mock("@/components/plan", () => ({
  MyPlansPanel: () => <a href={ROUTES.createPlan}>Crear un plan nuevo</a>,
}));

describe("MyPlansPage", () => {
  it("names the screen and offers the create-plan entry point", () => {
    render(<MyPlansPage />);

    expect(
      screen.getByRole("heading", { name: "Mis planes", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Crear un plan nuevo" }),
    ).toHaveAttribute("href", ROUTES.createPlan);
  });

  it("labels the section with its heading", () => {
    render(<MyPlansPage />);

    const heading = screen.getByRole("heading", { name: "Mis planes" });
    expect(
      screen.getByRole("region", { name: "Mis planes" }),
    ).toBeInTheDocument();
    expect(heading).toHaveAttribute("id", "my-plans-title");
  });
});
