import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("renders an accessible button with type button by default", () => {
    render(<Button>Crear plan</Button>);

    expect(screen.getByRole("button", { name: "Crear plan" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("runs the callback when the user clicks", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Crear plan</Button>);

    await user.click(screen.getByRole("button", { name: "Crear plan" }));

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("keeps the received className and allows overriding the type", () => {
    render(
      <Button type="submit" className="w-full">
        Guardar
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Guardar" });

    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("w-full");
  });
});
