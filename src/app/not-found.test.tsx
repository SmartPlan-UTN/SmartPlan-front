import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ROUTES } from "@/lib/routes";

import NotFoundPage from "./not-found";

describe("NotFoundPage", () => {
  it("explains the missing route and offers a way back home", () => {
    render(<NotFoundPage />);

    expect(
      screen.getByRole("heading", { name: "Esta página no existe" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Error 404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /volver al inicio/i })).toHaveAttribute(
      "href",
      ROUTES.home,
    );
  });
});
