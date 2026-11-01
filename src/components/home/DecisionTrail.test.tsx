import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PlanFunnel } from "@/types";

import { DecisionTrail, trailSteps } from "./DecisionTrail";

const funnel: PlanFunnel = {
  experienceLabel: "Tragos",
  places: 83,
  openAtTime: 80,
  confirmedOpenAtTime: 4,
  knownWithinBudget: null,
  withPrice: 2,
  fitsCharacter: 4,
  character: "Fachero",
  combinations: 40,
  proposals: 3,
  verifiedLive: 3,
};

describe("DecisionTrail", () => {
  it("only narrates counts the planner recorded", () => {
    expect(trailSteps(funnel, 3).map((step) => step.value)).toEqual([83, 4, 4, 2, 3]);
  });

  it("leaves out a step with nothing to say instead of inventing one", () => {
    const steps = trailSteps(
      { ...funnel, fitsCharacter: 0, character: null, confirmedOpenAtTime: 0, withPrice: 0 },
      1,
    );
    expect(steps.map((step) => step.value)).toEqual([83, 1]);
  });

  it("quotes the person's word for the character", () => {
    render(<DecisionTrail funnel={funnel} finalists={3} />);
    expect(screen.getByText(/encajan especialmente con «fachero»/)).toBeInTheDocument();
  });

  it("does not render a one-step funnel", () => {
    const { container } = render(
      <DecisionTrail funnel={{ ...funnel, fitsCharacter: 0, confirmedOpenAtTime: 0, withPrice: 0 }} finalists={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
