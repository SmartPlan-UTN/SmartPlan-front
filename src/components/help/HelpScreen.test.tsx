import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { HelpScreen } from "./HelpScreen";
import { FAQS, SUPPORT_EMAIL, USER_MANUAL_URL } from "./helpContent";

describe("HelpScreen", () => {
  it("links to the user manual in a new tab", () => {
    render(<HelpScreen />);

    const manual = screen.getByRole("link", { name: /abrir el manual/i });
    expect(manual).toHaveAttribute("href", USER_MANUAL_URL);
    expect(manual).toHaveAttribute("target", "_blank");
  });

  it("offers a support email as the contact channel", () => {
    render(<HelpScreen />);

    expect(screen.getByText(SUPPORT_EMAIL)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /escribir a soporte/i }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(new RegExp(`^mailto:${SUPPORT_EMAIL}\\?`)),
    );
  });

  it("exposes the anchors the footer links to", () => {
    const { container } = render(<HelpScreen />);

    for (const id of ["manual", "faq", "contact"]) {
      expect(container.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("lists every FAQ and reveals its answer when opened", async () => {
    const user = userEvent.setup();
    render(<HelpScreen />);

    const [first] = FAQS;
    const question = screen.getByText(first.question);
    const answer = screen.getByText(first.answer);
    expect(screen.getAllByRole("group")).toHaveLength(FAQS.length);
    expect(answer).not.toBeVisible();

    await user.click(question);

    expect(answer).toBeVisible();
  });
});
