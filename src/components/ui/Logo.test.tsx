import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders one image for a surface that never changes with the theme", () => {
    render(<Logo variant="white" kind="full" />);

    const image = screen.getByRole("img", { name: "smartplan" });
    expect(image.getAttribute("src")).toContain("logo-full-white.png");
  });

  it("renders both lockups when the surface follows the theme, for CSS to pick", () => {
    render(<Logo variant="ember" darkVariant="ember-cream" kind="full" />);

    const [light, dark] = screen.getAllByRole("img", { name: "smartplan" });
    expect(light.getAttribute("src")).toContain("logo-full-ember.png");
    expect(light).toHaveClass("sp-light-only");
    expect(dark.getAttribute("src")).toContain("logo-full-ember-cream.png");
    expect(dark).toHaveClass("sp-dark-only");
  });
});
