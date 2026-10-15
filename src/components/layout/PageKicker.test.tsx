import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageKicker } from "./PageKicker";

describe("PageKicker", () => {
  it("signs the label with the ember isotype and keeps the mark decorative", () => {
    const { container } = render(<PageKicker>Lo que creaste</PageKicker>);

    expect(screen.getByText("Lo que creaste")).toHaveClass("sp-page-kicker");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    const mark = container.querySelector("img");
    expect(mark).toHaveAttribute("alt", "");
    expect(mark?.getAttribute("src")).toContain("logo-mark-ember.png");
  });
});
