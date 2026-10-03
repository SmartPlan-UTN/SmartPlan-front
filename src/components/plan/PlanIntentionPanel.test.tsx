import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlanIntentionPanel, resolvePanelState } from "./PlanIntentionPanel";

describe("resolvePanelState (CU22, #130)", () => {
  it("maps the viewer state to one panel state", () => {
    expect(resolvePanelState("view-only")).toBe("absent");
    expect(resolvePanelState("selectable")).toBe("intend");
    expect(resolvePanelState("selected")).toBe("added");
  });
});

describe("PlanIntentionPanel (CU22, PAN 17, #130)", () => {
  const onIntend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPanel(props: Partial<Parameters<typeof PlanIntentionPanel>[0]>) {
    return render(
      <PlanIntentionPanel
        viewerPlanState="selectable"
        activeOutingId={null}
        busy={false}
        onIntend={onIntend}
        {...props}
      />,
    );
  }

  it("offers 'Lo voy a hacer' as a one-shot action, not a toggle", async () => {
    const user = userEvent.setup();
    renderPanel({});

    const button = screen.getByRole("button", { name: "Lo voy a hacer" });
    expect(button).not.toHaveAttribute("aria-pressed");
    await user.click(button);

    expect(onIntend).toHaveBeenCalledTimes(1);
  });

  it("disables the action while it saves", () => {
    renderPanel({ busy: true });

    expect(screen.getByRole("button", { name: "Lo voy a hacer" })).toBeDisabled();
  });

  it("once added, says so and links to the outing — with no undo", () => {
    renderPanel({ viewerPlanState: "selected", activeOutingId: 40 });

    expect(screen.getByText("Agregado a Mis salidas")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ver en mis salidas/i }),
    ).toHaveAttribute("href", "/outings/40");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/ya no lo voy a hacer/i)).not.toBeInTheDocument();
  });

  it("falls back to Mis salidas when the outing id is unknown", () => {
    renderPanel({ viewerPlanState: "selected", activeOutingId: null });

    expect(
      screen.getByRole("link", { name: /ver en mis salidas/i }),
    ).toHaveAttribute("href", "/outings");
  });

  it("renders nothing for a plan the viewer cannot choose", () => {
    const { container } = renderPanel({ viewerPlanState: "view-only" });

    expect(container).toBeEmptyDOMElement();
  });
});
