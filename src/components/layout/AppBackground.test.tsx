import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import styles from "./layout.module.css";

let pathname = "/plans";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("@/components/ui", () => ({
  MoodBackground: ({
    active,
    mood,
    tideKey,
  }: {
    active: boolean;
    mood: string;
    tideKey: string;
  }) => (
    <div
      data-testid="mood-background"
      data-active={String(active)}
      data-mood={mood}
      data-tide-key={tideKey}
    />
  ),
}));

import { AppBackground } from "./AppBackground";

describe("AppBackground", () => {
  it("keeps one user canvas configured across route changes", () => {
    pathname = "/plans";
    const { rerender } = render(<AppBackground />);
    const canvas = screen.getByTestId("mood-background");

    expect(canvas).toHaveAttribute("data-active", "true");
    expect(canvas).toHaveAttribute("data-mood", "gastronomia");
    expect(canvas.parentElement).toHaveClass(
      styles.appBackgroundBelowNavbar,
    );

    pathname = "/login";
    rerender(<AppBackground />);

    expect(screen.getByTestId("mood-background")).toBe(canvas);
    expect(canvas).toHaveAttribute("data-mood", "romantica");
    expect(canvas.parentElement).not.toHaveClass(
      styles.appBackgroundBelowNavbar,
    );
  });

  it("hides and pauses the user canvas in administration", () => {
    pathname = "/admin/users";
    render(<AppBackground />);

    const canvas = screen.getByTestId("mood-background");
    expect(canvas).toHaveAttribute("data-active", "false");
    expect(canvas.parentElement).toHaveClass(styles.appBackgroundHidden);
  });
});
