import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { outingCreation, outingDetail } from "@/test/fixtures/outings";

import { OutingDetailView } from "./OutingDetailView";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

const getOuting = vi.hoisted(() => vi.fn());
const completeOuting = vi.hoisted(() => vi.fn());
const cancelOuting = vi.hoisted(() => vi.fn());
const repeatOuting = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/api")>()),
  getOuting,
  completeOuting,
  cancelOuting,
  repeatOuting,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OutingDetailView (#130, CU22, CU23)", () => {
  it("shows the frozen itinerary and where it came from", async () => {
    getOuting.mockResolvedValue(outingDetail());
    render(<OutingDetailView outingId={40} />);

    expect(
      await screen.findByRole("heading", { name: "Día de viñedos", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bodega boutique → Almuerzo de campo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "«Día de viñedos»" })).toHaveAttribute(
      "href",
      "/plans/7",
    );
  });

  it("says when the original plan is no longer available", async () => {
    getOuting.mockResolvedValue(
      outingDetail({
        source: { id: 7, kind: "authored", title: "x", available: false, hasCommunity: false },
      }),
    );
    render(<OutingDetailView outingId={40} />);

    expect(
      await screen.findByText("El plan original ya no está disponible"),
    ).toBeInTheDocument();
  });

  it("marks it as done and opens the feedback right away", async () => {
    getOuting.mockResolvedValue(outingDetail());
    completeOuting.mockResolvedValue(
      outingDetail({
        status: "completed",
        completedAt: "2026-09-30T12:00:00.000Z",
        feedbackState: "available",
      }),
    );
    const user = userEvent.setup();
    render(<OutingDetailView outingId={40} />);

    await user.click(
      await screen.findByRole("button", { name: /marcar como realizada/i }),
    );

    expect(completeOuting).toHaveBeenCalledWith(40);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Ahora no" }));
    // Still answerable later, from the page itself.
    expect(await screen.findByText("Contanos tu experiencia")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /volver a hacer este plan/i }),
    ).toBeInTheDocument();
  });

  it("cancels only after confirming, then goes back to Mis salidas", async () => {
    getOuting.mockResolvedValue(outingDetail());
    cancelOuting.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<OutingDetailView outingId={40} />);

    await user.click(await screen.findByRole("button", { name: /cancelar salida/i }));
    expect(cancelOuting).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /sí, cancelar salida/i }));

    expect(cancelOuting).toHaveBeenCalledWith(40);
    expect(push).toHaveBeenCalledWith("/outings");
  });

  it("does it again as a new outing and opens it", async () => {
    getOuting.mockResolvedValue(
      outingDetail({
        status: "completed",
        completedAt: "2026-09-30T12:00:00.000Z",
        feedbackState: "submitted",
        feedback: {
          rating: 5,
          tags: [],
          comment: null,
          actualCost: null,
          actualDuration: null,
          shared: false,
          commentHidden: false,
          createdAt: "2026-09-30T13:00:00.000Z",
        },
      }),
    );
    repeatOuting.mockResolvedValue(outingCreation({ id: 41 }));
    const user = userEvent.setup();
    render(<OutingDetailView outingId={40} />);

    await user.click(
      await screen.findByRole("button", { name: /volver a hacer este plan/i }),
    );

    expect(repeatOuting).toHaveBeenCalledWith(40);
    expect(push).toHaveBeenCalledWith("/outings/41");
  });

  it("explains a missing outing", async () => {
    const { ApiError } = await import("@/lib/api");
    getOuting.mockRejectedValue(
      new ApiError({ message: "x", type: "HTTP", status: 404 }),
    );
    render(<OutingDetailView outingId={40} />);

    expect(
      await screen.findByText("No encontramos esta salida"),
    ).toBeInTheDocument();
  });
});
