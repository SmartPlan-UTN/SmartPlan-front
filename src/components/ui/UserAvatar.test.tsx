import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserAvatar } from "./UserAvatar";

describe("UserAvatar", () => {
  it("shows the uppercase initials and keeps them decorative", () => {
    render(<UserAvatar name="María" lastName="López" userId={1} />);

    expect(screen.getByText("ML")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows only the available initial when either name is blank", () => {
    const view = render(
      <UserAvatar name="  " lastName="Pérez" userId={1} />,
    );

    expect(screen.getByText("P")).toBeInTheDocument();

    view.rerender(<UserAvatar name="Ana" lastName="" userId={1} />);

    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
