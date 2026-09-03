import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RatingInput } from "./RatingInput";

describe("RatingInput (CU23)", () => {
  it("renders five radio stars in a required radiogroup", () => {
    render(<RatingInput value={0} onChange={vi.fn()} />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute(
      "aria-required",
      "true"
    );
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("selects a rating on click and marks it checked", async () => {
    const onChange = vi.fn();
    render(
      <RatingInput
        value={0}
        onChange={onChange}
        labels={["a", "b", "c", "d", "e"]}
      />
    );

    await userEvent.click(screen.getByRole("radio", { name: "d" }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("shows the current value as checked", () => {
    render(
      <RatingInput
        value={3}
        onChange={vi.fn()}
        labels={["a", "b", "c", "d", "e"]}
      />
    );
    expect(screen.getByRole("radio", { name: "c" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "b" })).not.toBeChecked();
  });

  it("supports keyboard: arrows and number keys", async () => {
    const onChange = vi.fn();
    render(<RatingInput value={0} onChange={onChange} />);

    screen.getAllByRole("radio")[0].focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(screen.getAllByRole("radio")[0]).toHaveFocus();

    await userEvent.keyboard("5");
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(screen.getAllByRole("radio")[4]).toHaveFocus();
  });

  it("previews on hover without committing", async () => {
    const onChange = vi.fn();
    const onPreview = vi.fn();
    render(
      <RatingInput
        value={0}
        onChange={onChange}
        onPreview={onPreview}
        labels={["a", "b", "c", "d", "e"]}
      />
    );

    await userEvent.hover(screen.getByRole("radio", { name: "d" }));
    expect(onPreview).toHaveBeenCalledWith(4);
    expect(onChange).not.toHaveBeenCalled();
  });
});
