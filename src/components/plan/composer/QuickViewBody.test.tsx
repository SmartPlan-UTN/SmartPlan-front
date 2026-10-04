import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActivity } from "@/lib/api";
import { categoryLabel } from "@/lib/utils/catalogLabels";
import type { ActivityDetailResult, ActivitySearchResult } from "@/types";

import {
  detailPageExtras,
  QuickViewBody,
  subjectFromActivity,
} from "./QuickViewBody";
import { clearStopInfoCache } from "./useStopInfo";

vi.mock("@/lib/api", () => ({ getActivity: vi.fn() }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

const summary: ActivitySearchResult = {
  id: 7,
  name: "Bodega del parque",
  description: "Una visita con degustación.",
  estimatedCost: 12000,
  estimatedDuration: 90,
  type: null,
  averageRating: 0,
  ratingCount: 0,
  distanceKm: null,
  categories: [{ id: 2, name: "Wineries" }],
};

function detail(overrides: Partial<ActivityDetailResult> = {}): ActivityDetailResult {
  return {
    ...summary,
    images: [],
    locations: [
      {
        id: 1,
        latitude: -32.9,
        longitude: -68.8,
        notes: null,
        place: {
          id: 4,
          name: "Parque General San Martín",
          description: "Una descripción del lugar que no va en la vista rápida.",
          address: "Av. Libertador 1",
          department: {
            id: 1,
            name: "Capital",
            city: { id: 1, name: "Mendoza", country: { id: 1, name: "Argentina" } },
          },
        },
      },
    ],
    ...overrides,
  };
}

function renderBody(stopNumber: number | null) {
  const onAdd = vi.fn();
  const onRemove = vi.fn();
  render(
    <QuickViewBody
      subject={subjectFromActivity(summary)}
      stopNumber={stopNumber}
      route={{ stops: [], last: null }}
      showMiniMap={false}
      titleId="t"
      disabled={false}
      onAdd={onAdd}
      onRemove={onRemove}
    />,
  );
  return { onAdd, onRemove };
}

describe("QuickViewBody", () => {
  beforeEach(() => {
    clearStopInfoCache();
    vi.mocked(getActivity).mockResolvedValue(detail());
  });

  it("shows what it is and where, from catalog data only", async () => {
    renderBody(null);
    expect(screen.getByRole("heading", { name: "Bodega del parque" })).toBeInTheDocument();
    expect(await screen.findByText("Parque General San Martín")).toBeInTheDocument();
    expect(screen.getByText("Av. Libertador 1")).toBeInTheDocument();
    // A glance, not the full page: the place's own description stays there.
    expect(screen.queryByText(/no va en la vista rápida/)).not.toBeInTheDocument();
    // Nothing on the full page that this does not already show.
    expect(screen.queryByRole("link", { name: /Ver ficha completa/ })).not.toBeInTheDocument();
  });

  it("adds with one press, then says it is a stop and offers an explicit Quitar", async () => {
    const user = userEvent.setup();
    const { onAdd } = renderBody(null);
    await user.click(screen.getByRole("button", { name: "Sumar al recorrido" }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it("removes only through its own button once it is a stop", async () => {
    const user = userEvent.setup();
    const { onAdd, onRemove } = renderBody(2);
    expect(screen.getByText("Parada 2 en tu recorrido")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sumar al recorrido" })).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Quitar Bodega del parque del recorrido" }),
    );
    expect(onRemove).toHaveBeenCalledWith(7);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("lets the catalog's detail fill in a trimmed summary (a plan being edited)", async () => {
    const onAdd = vi.fn();
    render(
      <QuickViewBody
        subject={subjectFromActivity({ ...summary, categories: [] })}
        stopNumber={1}
        route={{ stops: [], last: null }}
        showMiniMap={false}
        titleId="t"
        disabled={false}
        onAdd={onAdd}
        onRemove={vi.fn()}
      />,
    );
    expect(await screen.findByText(categoryLabel("Wineries"))).toBeInTheDocument();
  });

  it("links the full page when its ratings have something to read", async () => {
    vi.mocked(getActivity).mockResolvedValue(detail({ ratingCount: 4, averageRating: 4.2 }));
    renderBody(null);
    expect(await screen.findByRole("link", { name: /Ver ficha completa/ })).toBeInTheDocument();
  });
});

describe("detailPageExtras", () => {
  const none = { descriptionClamped: false, thumbnailShown: false };

  it("is false until the detail is known, and when the page would only repeat", () => {
    expect(detailPageExtras(undefined, none)).toBe(false);
    expect(detailPageExtras(null, none)).toBe(false);
    expect(detailPageExtras(detail(), none)).toBe(false);
  });

  it("counts each section of the page only when it has content", () => {
    const photo = { id: 1, url: "/m/1", isPrimary: true, displayOrder: 0, createdAt: "" };
    // The one photo already shown as the thumbnail adds nothing…
    expect(
      detailPageExtras(detail({ images: [photo] }), { ...none, thumbnailShown: true }),
    ).toBe(false);
    // …a gallery beyond it does.
    expect(
      detailPageExtras(detail({ images: [photo, { ...photo, id: 2 }] }), {
        ...none,
        thumbnailShown: true,
      }),
    ).toBe(true);
    expect(detailPageExtras(detail({ ratingCount: 1 }), none)).toBe(true);
    const location = detail().locations[0];
    expect(
      detailPageExtras(detail({ locations: [location, { ...location, id: 2 }] }), none),
    ).toBe(true);
    expect(detailPageExtras(detail(), { ...none, descriptionClamped: true })).toBe(true);
  });
});
