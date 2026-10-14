import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOuting } from "@/lib/api";

import { ActivityCostsField, parseCostAmount } from "./ActivityCostsField";

vi.mock("@/lib/api", () => ({ getOuting: vi.fn() }));

function Harness({ onValues }: { onValues: (v: Record<number, string>) => void }) {
  const [values, setValues] = useState<Record<number, string>>({});
  return (
    <ActivityCostsField
      outingId={7}
      values={values}
      onChange={(next) => {
        setValues(next);
        onValues(next);
      }}
    />
  );
}

describe("parseCostAmount", () => {
  it("parses Argentine formats and rejects empty, zero and nonsense", () => {
    expect(parseCostAmount("12.500")).toBe(12500);
    expect(parseCostAmount("12500,50")).toBe(12500.5);
    expect(parseCostAmount("")).toBeNull();
    expect(parseCostAmount("0")).toBeNull();
    expect(parseCostAmount("abc")).toBeNull();
  });
});

describe("ActivityCostsField", () => {
  beforeEach(() => {
    vi.mocked(getOuting).mockReset();
    vi.mocked(getOuting).mockResolvedValue({
      details: [
        { order: 2, activity: { id: 11, name: "Museo" } },
        { order: 1, activity: { id: 10, name: "Bodega" } },
        { order: 3, activity: { id: 10, name: "Bodega" } },
      ],
    } as never);
  });

  it("loads the outing activities only when opened, in itinerary order, without repeats", async () => {
    const user = userEvent.setup();
    render(<Harness onValues={() => {}} />);
    expect(getOuting).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Contar cuánto costó/ }));

    await waitFor(() => {
      expect(screen.getAllByRole("textbox")).toHaveLength(2);
    });
    const labels = screen.getAllByText(/Bodega|Museo/).map((n) => n.textContent);
    expect(labels).toEqual(["Bodega", "Museo"]);
  });

  it("reports independent amounts per activity and filters non-numeric input", async () => {
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(<Harness onValues={onValues} />);
    await user.click(screen.getByRole("button", { name: /Contar cuánto costó/ }));
    const inputs = await screen.findAllByRole("textbox");

    await user.type(inputs[0], "12x500");

    expect(onValues).toHaveBeenLastCalledWith({ 10: "12500" });
  });

  it("tells the person it never splits the total", async () => {
    const user = userEvent.setup();
    render(<Harness onValues={() => {}} />);
    await user.click(screen.getByRole("button", { name: /Contar cuánto costó/ }));
    expect(await screen.findByText(/no se\s+reparte a partir del total/)).toBeInTheDocument();
  });

  it("does not block the rest of the form when activities cannot load", async () => {
    vi.mocked(getOuting).mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<Harness onValues={() => {}} />);
    await user.click(screen.getByRole("button", { name: /Contar cuánto costó/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/No pudimos cargar/);
  });
});
