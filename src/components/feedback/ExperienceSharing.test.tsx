import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanFeedback } from "@/types";
import { ApiError } from "@/lib/api";

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

    expect(screen.getByText("Visible en la comunidad")).toBeInTheDocument();
    expect(screen.getByText(/solo aparece si también es público/)).toBeInTheDocument();
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

  it("links to the existing public review when a repeat cannot become another review", async () => {
    const user = userEvent.setup();
    setFeedbackSharing.mockRejectedValue(
      new ApiError({
        message: "Already shared",
        type: "HTTP",
        status: 409,
        code: "COMMUNITY_REVIEW_ALREADY_EXISTS",
        data: { existingExperienceId: 42 },
      }),
    );
    render(
      <ExperienceSharing outingId={9} planTitle="Bodegas" feedback={feedback()} onChange={vi.fn()} />,
    );

    await user.click(screen.getByRole("switch"));
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cambiarlo");
    expect(screen.getByRole("link", { name: "Abrir tu reseña y sumar esta salida" })).toHaveAttribute(
      "href",
      "/community/experiences/42",
    );
  });

  it("shows the existing review after a new outing was saved privately", () => {
    render(
      <ExperienceSharing
        outingId={9}
        planTitle="Bodegas"
        feedback={feedback({ existingCommunityExperienceId: 42 })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Ya tenés una reseña pública de este plan/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir tu reseña y sumar esta salida" })).toHaveAttribute(
      "href",
      "/community/experiences/42",
    );
  });
});

describe("ExperienceSummary moderation trace (#156)", () => {
  it("tells the author only when an administrator removed their comment", () => {
    const { rerender } = render(
      <ExperienceSummary feedback={feedback({ shared: true })} estimatedTotalCost={1000} />,
    );
    expect(screen.queryByText(/eliminó tu comentario de la comunidad/)).not.toBeInTheDocument();

    rerender(
      <ExperienceSummary
        feedback={feedback({ shared: true, commentHidden: true })}
        estimatedTotalCost={1000}
      />,
    );
    expect(screen.getByText(/eliminó tu comentario de la comunidad/)).toBeInTheDocument();
  });
});
