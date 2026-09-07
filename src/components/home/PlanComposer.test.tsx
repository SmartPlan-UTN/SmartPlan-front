import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PlanComposer } from "./PlanComposer";

const FIELD = /contale a smartplan qué querés hacer/i;

describe("PlanComposer", () => {
  it("rejects a submission shorter than 3 characters without calling onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PlanComposer submitting={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(FIELD), "hi");
    await user.click(screen.getByRole("button", { name: "Planificar" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/contale un poco más/i);
  });

  it("submits the trimmed query with an empty context when no chip was touched", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PlanComposer submitting={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(FIELD), "  algo romántico para hoy  ");
    await user.click(screen.getByRole("button", { name: "Planificar" }));

    expect(onSubmit).toHaveBeenCalledWith("algo romántico para hoy", {});
  });

  it("submits on Enter without Shift, and does not submit on Shift+Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PlanComposer submitting={false} onSubmit={onSubmit} />);

    const textarea = screen.getByLabelText(FIELD);
    await user.type(textarea, "algo con amigos");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(textarea, "{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("algo con amigos", {});
  });

  it("only includes a context field once the user has actually set it via a chip", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PlanComposer submitting={false} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /momento/i }));
    await user.click(screen.getByRole("option", { name: "Tarde" }));

    await user.type(screen.getByLabelText(FIELD), "algo lindo");
    await user.click(screen.getByRole("button", { name: "Planificar" }));

    expect(onSubmit).toHaveBeenCalledWith("algo lindo", { timeOfDay: "afternoon" });
  });

  it("disables the textarea and submit button while submitting", () => {
    render(<PlanComposer submitting onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(FIELD)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Planificar" })).toBeDisabled();
  });

  it("uses a suggested idea to fill and focus the composer without submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <PlanComposer
        submitting={false}
        suggestions={["Aire libre"]}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Aire libre" }));

    const textarea = screen.getByLabelText(FIELD);
    expect(textarea).toHaveValue("Aire libre");
    expect(textarea).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps a real static placeholder underneath the animated one", () => {
    render(<PlanComposer submitting={false} onSubmit={vi.fn()} />);

    // The typewriter overlay is decorative: what assistive technology, a
    // no-JS render and reduced motion all fall back to is this attribute.
    expect(screen.getByLabelText(FIELD)).toHaveAttribute(
      "placeholder",
      "Escribí tu idea…",
    );
  });

  it("swaps the starters for the keyboard hint once the field is engaged", async () => {
    const user = userEvent.setup();
    render(
      <PlanComposer
        submitting={false}
        suggestions={["Aire libre"]}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Aire libre" })).toBeInTheDocument();

    await user.click(screen.getByLabelText(FIELD));

    expect(screen.queryByRole("button", { name: "Aire libre" })).not.toBeInTheDocument();
  });

  it("renders the trailing rail slot next to the context chips", () => {
    render(
      <PlanComposer
        submitting={false}
        trailing={<button type="button">Sorpréndeme</button>}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Sorpréndeme" })).toBeInTheDocument();
  });
});
