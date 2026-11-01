import type { ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth";

/**
 * Session-protected routes whose visual design must span the viewport.
 *
 * Unlike `(private)`, this group intentionally does not add `Container`:
 * plan detail owns a full-bleed hero and plan generation owns its own page
 * composition. The route group stays out of the public URL.
 */
export default function PrivateFullBleedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
