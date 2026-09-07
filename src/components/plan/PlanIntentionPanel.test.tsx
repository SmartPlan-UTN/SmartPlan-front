import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlanIntentionPanel, resolvePanelState } from "./PlanIntentionPanel";

describe("resolvePanelState (CU22)", () => {
  it("maps the viewer state and plan status to one panel state", () => {
    expect(resolvePanelState("view-only", "generated")).toBe("absent");
    expect(resolvePanelState("selectable", "generated")).toBe("intend");
    expect(resolvePanelState("selected", "generated")).toBe("intending");
    // A finished plan is a record only for the viewer who marked it.
    expect(resolvePanelState("selected", "completed")).toBe("done");
    expect(resolvePanelState("selectable", "completed")).toBe("absent");
  });
});

describe("PlanIntentionPanel (CU22, PAN 17)", () => {
  const handlers = { onIntend: vi.fn(), onWithdraw: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPanel(props: Partial<Parameters<typeof PlanIntentionPanel>[0]>) {
    return render(
      <PlanIntentionPanel
        viewerPlanState="selectable"
        statusKey="generated"
        busy={false}
        onIntend={handlers.onIntend}
        onWithdraw={handlers.onWithdraw}
        {...props}
      />,
    );
  }

  it("renders nothing for a view-only viewer", () => {
    const { container } = renderPanel({ viewerPlanState: "view-only" });
    expect(container).toBeEmptyDOMElement();
  });

  it("off state: one toggle, aria-pressed false, calls onIntend once", async () => {
    const user = userEvent.setup();
    renderPanel({ viewerPlanState: "selectable" });

    const toggle = screen.getByRole("button", { name: /^lo voy a hacer$/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(handlers.onIntend).toHaveBeenCalledOnce();
    expect(handlers.onWithdraw).not.toHaveBeenCalled();
  });

  it("on state: same toggle and label, aria-pressed true, clicking again withdraws", async () => {
    const user = userEvent.setup();
    renderPanel({ viewerPlanState: "selected" });

    // The label never changes — only aria-pressed and the visuals.
    const toggle = screen.getByRole("button", { name: /^lo voy a hacer$/i });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    // No separate revert control.
    expect(screen.getAllByRole("button")).toHaveLength(1);

    await user.click(toggle);
    expect(handlers.onWithdraw).toHaveBeenCalledOnce();
    expect(handlers.onIntend).not.toHaveBeenCalled();
  });

  it("busy freezes the toggle", () => {
    renderPanel({ viewerPlanState: "selected", busy: true });
    expect(
      screen.getByRole("button", { name: /^lo voy a hacer$/i }),
    ).toBeDisabled();
  });

  it("done state: renders a record, no interactive toggle", () => {
    renderPanel({ viewerPlanState: "selected", statusKey: "completed" });

    expect(screen.getByText("Hiciste este plan")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
