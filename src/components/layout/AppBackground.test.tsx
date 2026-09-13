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
    tideKey,
  }: {
    active: boolean;
    tideKey: string;
  }) => (
    <div
      data-testid="mood-background"
      data-active={String(active)}
      data-tide-key={tideKey}
    />
  ),
}));

import { AppBackground } from "./AppBackground";

describe("AppBackground", () => {
  it("leaves the landing surface free of the shared wave canvas", () => {
    pathname = "/";

    render(<AppBackground />);

    expect(screen.queryByTestId("mood-background")).not.toBeInTheDocument();
  });

  it("keeps one canvas across route changes and breaks a wave per route", () => {
    pathname = "/plans";
    const { rerender } = render(<AppBackground />);
    const canvas = screen.getByTestId("mood-background");

    expect(canvas).toHaveAttribute("data-active", "true");
    expect(canvas).toHaveAttribute("data-tide-key", "/plans");

    pathname = "/favorites";
    rerender(<AppBackground />);

    expect(screen.getByTestId("mood-background")).toBe(canvas);
    expect(canvas).toHaveAttribute("data-tide-key", "/favorites");
  });

  it.each(["/login", "/signup", "/recover-password", "/reset-password"])(
    "crops the horizon to the form panel on %s",
    (route) => {
      pathname = route;
      render(<AppBackground />);

      expect(screen.getByTestId("mood-background").parentElement).toHaveClass(
        styles.appBackgroundAuthHorizon,
      );
    },
  );

  it("does not crop the horizon outside the auth screens", () => {
    pathname = "/history";
    render(<AppBackground />);

    expect(
      screen.getByTestId("mood-background").parentElement,
    ).not.toHaveClass(styles.appBackgroundAuthHorizon);
  });

  it("hides and pauses the user canvas in administration", () => {
    pathname = "/admin/users";
    render(<AppBackground />);

    const canvas = screen.getByTestId("mood-background");
    expect(canvas).toHaveAttribute("data-active", "false");
    expect(canvas.parentElement).toHaveClass(styles.appBackgroundHidden);
  });
});
