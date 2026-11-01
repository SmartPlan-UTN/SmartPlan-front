import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PlanUnderstanding } from "@/types";

import { ResultsHeader } from "./ResultsHeader";

const understanding: PlanUnderstanding = {
  chips: [
    { key: "experiences", label: "Tomar algo", source: "text", icon: "🍸" },
    { key: "facet", label: "Fachero", source: "text", icon: "✨" },
    { key: "facet", label: "Sin boliche", source: "text", polarity: "avoid", icon: "🚫" },
    { key: "party", label: "2 personas", source: "inferred" },
  ],
  missing: ["when", "budget"],
  values: {
    occasion: null, partySize: 2, date: "2026-10-17", startMinutes: null, now: false,
    budget: null, budgetStrict: false, travelTolerance: "medium", experiences: ["drinks"],
    vibe: [], pricePreference: null, indoorOnly: false, freeOnly: false,
  },
};

function setup(overrides: Partial<Parameters<typeof ResultsHeader>[0]> = {}) {
  const props = {
    query: "Un lugar fachero para tomar algo, pero no boliche",
    understanding,
    onBack: vi.fn(),
    onSearch: vi.fn(),
    onAddContext: vi.fn(),
    ...overrides,
  };
  render(<ResultsHeader {...props} />);
  return props;
}

describe("ResultsHeader", () => {
  it("shows what was understood in the person's own words, including refusals", () => {
    setup();
    expect(screen.getByText("Entendí la idea")).toBeInTheDocument();
    expect(screen.getByText("Fachero")).toBeInTheDocument();
    expect(screen.getByText("Sin boliche")).toBeInTheDocument();
    expect(screen.getByText("deducido")).toBeInTheDocument();
  });

  it("offers only the context that is still unknown, never as a claim", () => {
    setup();
    expect(screen.getByRole("button", { name: /cuándo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /presupuesto/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /con quién/i })).not.toBeInTheDocument();
  });

  it("adds one piece of optional context and reports it", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("button", { name: /cuándo/i }));
    await user.click(screen.getByRole("button", { name: "A la noche" }));
    expect(props.onAddContext).toHaveBeenCalledWith({ timeOfDay: "evening" });
  });

  it("lets the budget be nothing at all", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("button", { name: /presupuesto/i }));
    await user.click(screen.getByRole("button", { name: "Gratis" }));
    expect(props.onAddContext).toHaveBeenCalledWith({ freeOnly: true });
  });

  it("runs the edited sentence again, and only when it changed", async () => {
    const user = userEvent.setup();
    const props = setup({ query: "una birra" });
    const input = screen.getByRole("textbox", { name: "Tu idea" });
    await user.type(input, " con los pibes{Enter}");
    expect(props.onSearch).toHaveBeenCalledWith("una birra con los pibes");
  });

  it("reads the idea while nothing has been understood yet", () => {
    setup({ understanding: null, thinking: true });
    expect(screen.getByText("Leyendo tu idea…")).toBeInTheDocument();
  });
});
