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

  it("picks the intent's full phrase, not the label on the chip", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<IntentChips onPick={onPick} />);

    await user.click(screen.getByRole("button", { name: "Cita" }));

    // The whole point of the chips: they demonstrate that the field takes
    // a sentence. A chip that inserted its own label would teach the
    // opposite — that this is a keyword box.
    const [picked] = onPick.mock.calls[0];
    expect(picked).toBe("Una cita al atardecer, con buena comida y vista");
    expect(picked.split(" ").length).toBeGreaterThan(3);
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
