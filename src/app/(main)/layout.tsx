import type { ReactNode } from "react";

import { AppShell } from "@/components/layout";

/**
 * Application layout: navbar on top, content below.
 *
 * Covers public screens and, through the `(private)` group, also the ones
 * that require a session. The auth screens (`/login`, `/signup`,
 * `/recover-password`, `/reset-password`) sit outside this layout and bring
 * their own, without a navbar.
 */
export default function MainLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
