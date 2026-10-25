import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MyPlansWorkspace } from "./MyPlansWorkspace";

const { navigation } = vi.hoisted(() => ({
  navigation: { params: new URLSearchParams(), push: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock("./MyPlansPanel", () => ({
  MyPlansPanel: () => <p>Authored listing</p>,
}));
vi.mock("./GeneratedPlansPanel", () => ({
  GeneratedPlansPanel: ({
    page,
    onPageChange,
  }: {
    page: number;
    onPageChange: (page: number) => void;
  }) => (
    <button onClick={() => onPageChange(page + 1)}>
      Generated page {page}
    </button>
  ),
}));

describe("My plans sections", () => {
  beforeEach(() => {
    navigation.params = new URLSearchParams();
    navigation.push.mockReset();
  });
  it("keeps authored plans as the default and exposes the generated history", () => {
    render(<MyPlansWorkspace />);
    expect(screen.getByText("Authored listing")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Creados por mí" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Generados para mí" }),
    ).toHaveAttribute("href", "/plans?tab=generated");
  });
  it("restores the generated tab and page from the URL", () => {
    navigation.params = new URLSearchParams("tab=generated&page=3");
    render(<MyPlansWorkspace />);
    expect(
      screen.getByRole("button", { name: "Generated page 3" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Authored listing")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Generados para mí" }),
    ).toHaveAttribute("aria-current", "page");
  });
  it.each(["-1", "abc", "0", "9999999999999999999999"])(
    "defaults invalid page %s to the first page",
    (page) => {
      navigation.params = new URLSearchParams({ tab: "generated", page });
      render(<MyPlansWorkspace />);
      expect(
        screen.getByRole("button", { name: "Generated page 1" }),
      ).toBeInTheDocument();
    },
  );
});
