import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Chip } from "./Chip";

it("exposes pressed state for a toggle button", () => {
  render(<Chip active>En casa</Chip>);
  expect(screen.getByRole("button", { name: "En casa", pressed: true })).toBeInTheDocument();
});

it("uses selected state without the invalid pressed attribute on a tab", () => {
  render(<Chip active role="tab" aria-selected>Actividades</Chip>);
  const tab = screen.getByRole("tab", { name: "Actividades", selected: true });
  expect(tab).not.toHaveAttribute("aria-pressed");
});

it("lets navigation chips omit toggle state", () => {
  render(<Chip aria-pressed={undefined}>Explorar</Chip>);
  expect(screen.getByRole("button", { name: "Explorar" })).not.toHaveAttribute("aria-pressed");
});
