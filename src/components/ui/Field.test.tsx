import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Field } from "./Field";

describe("Field", () => {
  it("associates the label with the input and leaves it valid with no error", () => {
    render(
      <Field label="Nombre" type="text" value="" onChange={() => {}} required />,
    );

    const input = screen.getByLabelText("Nombre");
    expect(input).toHaveAttribute("type", "text");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("calls onChange as the user types", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Field label="Nombre" type="text" value="" onChange={handleChange} />,
    );

    await user.type(screen.getByLabelText("Nombre"), "Ana");

    expect(handleChange).toHaveBeenCalled();
  });

  it("shows the error message and marks the input invalid", () => {
    render(
      <Field
        label="Email"
        type="email"
        value=""
        onChange={() => {}}
        error="Ingresá un email válido"
      />,
    );

    expect(screen.getByText("Ingresá un email válido")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("renders a read-only input without onChange, with no console warning", () => {
    render(<Field label="Email" type="email" value="ana@example.com" disabled />);

    const input = screen.getByLabelText("Email");
    expect(input).toHaveValue("ana@example.com");
    expect(input).toBeDisabled();
  });

  it("renders the right-slot toggle and reports its pressed state", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Field
        label="Contraseña"
        type="password"
        value=""
        onChange={() => {}}
        rightSlot={{
          icon: "eye",
          label: "Mostrar contraseña",
          pressed: false,
          onClick: handleClick,
        }}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Mostrar contraseña" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
