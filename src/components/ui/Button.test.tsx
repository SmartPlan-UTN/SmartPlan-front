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

  it("conserva el className recibido y permite sobrescribir el type", () => {
    render(
      <Button type="submit" className="w-full">
        Guardar
      </Button>,
    );

    const boton = screen.getByRole("button", { name: "Guardar" });

    expect(boton).toHaveAttribute("type", "submit");
    expect(boton).toHaveClass("w-full");
  });
});
