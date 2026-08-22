import type { ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth";
import { Container } from "@/components/layout";

/**
 * Route group that requires a session.
 *
 * Everything nested under `(private)` is protected just by being here: no
 * need to remember to wrap each screen, and a new screen is protected by
 * creating it inside the folder. The parentheses keep the group out of the
 * URL: `(main)/(private)/favorites` is still `/favorites`.
 *
 * These screens are lists and forms, so the group also provides the
 * `Container`. Public screens opt into it themselves: the home page goes
 * full-bleed.
 */
export default function PrivateLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <ProtectedRoute>
      <Container>{children}</Container>
    </ProtectedRoute>
  );
}
