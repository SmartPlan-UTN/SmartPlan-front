import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ActivitySearchResult } from "@/types";

import { ResultRow } from "./ResultRow";

vi.mock("@/lib/api", () => ({ getActivity: vi.fn(() => new Promise(() => {})) }));

const activity: ActivitySearchResult = {
  id: 31,
  name: "Bodega del parque",
  description: "Una visita con degustación.",
  estimatedCost: 12000,
  estimatedDuration: 90,
  type: null,
  averageRating: 4.5,
  ratingCount: 18,
  distanceKm: null,
  categories: [{ id: 2, name: "Wineries" }],
};

function renderRow(stopNumber: number | null, expanded = false) {
  const handlers = {
    onInspect: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
  };
  render(
    <ul>
      <ResultRow
        activity={activity}
        stopNumber={stopNumber}
        disabled={false}
        showDistance={false}
        expanded={expanded}
        {...handlers}
      >
        <p>Vista rápida</p>
      </ResultRow>
    </ul>,
  );
  return handlers;
}

describe("ResultRow", () => {
  it("keeps looking separate from adding", async () => {
    const user = userEvent.setup();
    const { onInspect, onAdd } = renderRow(null);

    await user.click(
      screen.getByRole("button", { name: "Ver detalles de Bodega del parque" }),
    );
    expect(onInspect).toHaveBeenCalledWith(activity);
    expect(onAdd).not.toHaveBeenCalled();

    // The name is an inspection target too, never an add.
    await user.click(screen.getByRole("button", { name: "Bodega del parque" }));
    expect(onInspect).toHaveBeenCalledTimes(2);
    expect(onAdd).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Agregar Bodega del parque" }));
    expect(onAdd).toHaveBeenCalledWith(activity);
  });

  it("takes a stop out from the same button once it is ✓", async () => {
    const user = userEvent.setup();
    const { onAdd, onRemove } = renderRow(2);

    expect(
      screen.queryByRole("button", { name: "Agregar Bodega del parque" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Quitar Bodega del parque del recorrido" }),
    );
    expect(onRemove).toHaveBeenCalledWith(31);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("closes its Quick View with Esc and hands focus back to ⓘ", async () => {
    const user = userEvent.setup();
    const { onInspect } = renderRow(null, true);
    await user.click(screen.getByText("Vista rápida"));
    screen.getByRole("button", { name: "Agregar Bodega del parque" }).focus();
    await user.keyboard("{Escape}");
    expect(onInspect).toHaveBeenCalledWith(activity);
    expect(
      screen.getByRole("button", { name: "Ver detalles de Bodega del parque" }),
    ).toHaveFocus();
  });

  it("opens its Quick View in place and says so", () => {
    renderRow(null, true);
    expect(
      screen.getByRole("button", { name: "Ver detalles de Bodega del parque" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Vista rápida")).toBeInTheDocument();
  });
});
