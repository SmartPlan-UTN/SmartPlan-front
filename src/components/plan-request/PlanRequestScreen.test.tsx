import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanRequestScreen } from "./PlanRequestScreen";

const submit = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks", () => ({ usePlanRequestPolling: () => ({
  phase: "generated", planRequestId: 15, query: "paseo gratis",
  resolvedContext: { budget: 0, partySize: 1 }, plans: [], understanding: null, lastSubmission: null, submit,
}) }));
vi.mock("@/components/home/PlanResults", () => ({ PlanResults: ({ returnTo }: { returnTo: string }) => <a href={returnTo}>Results origin</a> }));
vi.mock("@/components/home/GenerationState", () => ({ GenerationState: () => null }));

describe("New plan search", () => {
  it("does not silently impose the previous inferred budget or party size", () => {
    render(<PlanRequestScreen requestId={15} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Tu idea" }), {
      target: { value: "Tengo 30000 pesos para dos personas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar de nuevo" }));
    expect(submit).toHaveBeenCalledWith({ query: "Tengo 30000 pesos para dos personas" });
  });
});


it("reopens the existing request without submitting a new search", () => {
  submit.mockClear();
  render(<PlanRequestScreen requestId={15} />);
  expect(screen.getByRole("link", { name: "Results origin" })).toHaveAttribute("href", "/plan-requests/15");
  expect(submit).not.toHaveBeenCalled();
});
