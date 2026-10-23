import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PlanReadiness } from "@/types";

import { PlanReadinessPanel } from "./PlanReadinessPanel";

const pending: PlanReadiness = {
  stage: "PREPARATION_REQUIRED",
  label: "Falta preparar",
  summary: "Falta confirmar: Entradas para Matrix.",
  ready: false,
  verifiedStops: 2,
  totalStops: 2,
  tasks: [
    {
      detailId: 7,
      kind: "TICKET",
      required: true,
      label: "Entradas para Matrix",
      status: "PENDING",
      confirmedAt: null,
      actionUrl: "https://cine.example/tickets",
      actionLabel: "Comprar en el sitio del cine",
    },
  ],
};

describe("PlanReadinessPanel", () => {
  it("shows the official link but only the person confirms the task", () => {
    const onToggle = vi.fn();
    render(<PlanReadinessPanel readiness={pending} onToggleTask={onToggle} />);

    expect(screen.getByText("Falta preparar")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Comprar en el sitio del cine/ });
    expect(link).toHaveAttribute("href", "https://cine.example/tickets");
    expect(onToggle).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Ya lo resolví" }));
    expect(onToggle).toHaveBeenCalledWith(pending.tasks[0], true);
  });

  it("offers undo once confirmed and hides the purchase link", () => {
    const confirmed: PlanReadiness = {
      ...pending,
      stage: "READY",
      label: "Listo",
      ready: true,
      tasks: [{ ...pending.tasks[0], status: "CONFIRMED", confirmedAt: "2026-10-18T10:00:00Z" }],
    };
    render(<PlanReadinessPanel readiness={confirmed} onToggleTask={vi.fn()} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: "Deshacer" })).toBeInTheDocument();
  });

  it("is read-only without a handler", () => {
    render(<PlanReadinessPanel readiness={pending} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
