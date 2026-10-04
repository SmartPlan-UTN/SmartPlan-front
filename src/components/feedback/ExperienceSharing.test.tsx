import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanFeedback } from "@/types";

import { ExperienceSharing } from "./ExperienceSharing";
import { ExperienceSummary } from "./ExperienceSummary";

const setFeedbackSharing = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  setFeedbackSharing,
}));

function feedback(overrides: Partial<PlanFeedback> = {}): PlanFeedback {
  return {
    id: 3,
    rating: 4,
    tags: [],
    comment: "Muy lindo",
    actualCost: null,
    actualDuration: null,
    shared: false,
    commentHidden: false,
    createdAt: "2026-09-20T12:00:00.000Z",
    ...overrides,
  };
}

describe("ExperienceSharing (#106)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shares a private experience and reports the backend's answer", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    setFeedbackSharing.mockResolvedValue(feedback({ shared: true }));
    render(
      <ExperienceSharing outingId={9} planTitle="Bodegas" feedback={feedback()} onChange={onChange} />,
    );

    const toggle = screen.getByRole("switch", { name: "Compartir con la comunidad" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Solo para vos")).toBeInTheDocument();

    await user.click(toggle);
    expect(setFeedbackSharing).toHaveBeenCalledWith(9, true);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ shared: true }));
  });

  it("makes a shared experience private again", async () => {
    const user = userEvent.setup();
    setFeedbackSharing.mockResolvedValue(feedback({ shared: false }));
    render(
      <ExperienceSharing
        outingId={9}
        planTitle="Bodegas"
        feedback={feedback({ shared: true })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Visible en la comunidad")).toBeInTheDocument();
    await user.click(screen.getByRole("switch"));
    expect(setFeedbackSharing).toHaveBeenCalledWith(9, false);
  });

  it("still lets a shared experience go private once the plan is unpublished", async () => {
    const user = userEvent.setup();
    setFeedbackSharing.mockResolvedValue(feedback({ shared: false }));
    render(
      <ExperienceSharing
        outingId={9}
        planTitle="Bodegas"
        feedback={feedback({ shared: true })}
        published={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("No se ve ahora")).toBeInTheDocument();
    expect(screen.getByText(/ya no está publicado/)).toBeInTheDocument();
    await user.click(screen.getByRole("switch"));
    expect(setFeedbackSharing).toHaveBeenCalledWith(9, false);
  });

  it("keeps the state and explains when the change fails", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    setFeedbackSharing.mockRejectedValue(new Error("down"));
    render(
      <ExperienceSharing outingId={9} planTitle="Bodegas" feedback={feedback()} onChange={onChange} />,
    );

    await user.click(screen.getByRole("switch"));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cambiarlo");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("ExperienceSummary moderation trace (#106)", () => {
  it("tells the author only when their comment was taken down", () => {
    const { rerender } = render(
      <ExperienceSummary feedback={feedback({ shared: true })} estimatedTotalCost={1000} />,
    );
    expect(screen.queryByText(/no se muestra en la comunidad/)).not.toBeInTheDocument();

    rerender(
      <ExperienceSummary
        feedback={feedback({ shared: true, commentHidden: true })}
        estimatedTotalCost={1000}
      />,
    );
    expect(screen.getByText(/no se muestra en la comunidad/)).toBeInTheDocument();
  });
});
