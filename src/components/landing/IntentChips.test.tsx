import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IntentChips } from "./IntentChips";
import { INTENTS } from "./landingContent";

describe("IntentChips", () => {
  it("offers one button per intent", () => {
    render(<IntentChips onPick={vi.fn()} />);

    for (const intent of INTENTS) {
      expect(screen.getByRole("button", { name: intent.label })).toBeInTheDocument();
    }
  });

  it("fills a natural, complete query selected from the chip's options", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const random = vi.spyOn(Math, "random").mockReturnValue(0.99);
    render(<IntentChips onPick={onPick} />);

    await user.click(screen.getByRole("button", { name: "Cita" }));

    const [picked] = onPick.mock.calls[0];
    const cita = INTENTS.find(({ label }) => label === "Cita")?.queries;
    expect(picked).toBe(cita?.[cita.length - 1]);
    expect(picked).toMatch(/cena y cine/i);
    expect(picked).toMatch(/horarios hay y cuánto sale/i);
    random.mockRestore();
  });

  it("offers multiple natural alternatives per intent", () => {
    expect(INTENTS.every(({ queries }) => queries.length >= 3)).toBe(true);
    expect(INTENTS.flatMap(({ queries }) => queries).every((query) => query.includes(" "))).toBe(true);
  });

  it("does not fire while disabled", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<IntentChips disabled onPick={onPick} />);

    await user.click(screen.getByRole("button", { name: "Cita" }));

    expect(onPick).not.toHaveBeenCalled();
  });

  it("keeps every chip reachable as a real button", () => {
    render(<IntentChips onPick={vi.fn()} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(INTENTS.length);
    for (const button of buttons) {
      expect(button).toHaveAttribute("type", "button");
    }
  });
});
