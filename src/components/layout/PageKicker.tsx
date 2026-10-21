import type { ReactNode } from "react";

import { Logo } from "@/components/ui";

export interface PageKickerProps {
  children: ReactNode;
}

/**
 * The small ember label above a page title, signed with the ember isotype so
 * every content screen carries the brand mark next to its heading (#135).
 * The mark is decorative: the label text is what assistive tech reads.
 */
export function PageKicker({ children }: PageKickerProps) {
  return (
    <p className="sp-label sp-page-kicker">
      <Logo
        variant="ember"
        kind="mark"
        height={16}
        alt=""
        className="sp-page-kicker-mark"
      />
      {children}
    </p>
  );
}
