import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("renderiza un botón accesible con type button por defecto", () => {
    render(<Button>Crear plan</Button>);

    expect(screen.getByRole("button", { name: "Crear plan" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("ejecuta el callback cuando el usuario hace click", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Crear plan</Button>);

    await user.click(screen.getByRole("button", { name: "Crear plan" }));

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
