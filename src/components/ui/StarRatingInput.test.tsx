import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StarRatingInput } from "./StarRatingInput";

describe("StarRatingInput", () => {
  it("renders five stars, none pressed when value is 0", () => {
    render(<StarRatingInput label="Tu puntaje" value={0} onChange={vi.fn()} />);

    const stars = screen.getAllByRole("button");
    expect(stars).toHaveLength(5);
    for (const star of stars) {
      expect(star).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("calls onChange with the clicked star's score", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StarRatingInput label="Tu puntaje" value={0} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "3 estrellas" }));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("marks the selected star as pressed", () => {
    render(<StarRatingInput label="Tu puntaje" value={4} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "4 estrellas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "1 estrella" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("disables every star when disabled", () => {
    render(<StarRatingInput label="Tu puntaje" value={0} onChange={vi.fn()} disabled />);

    for (const star of screen.getAllByRole("button")) {
      expect(star).toBeDisabled();
    }
  });
});
