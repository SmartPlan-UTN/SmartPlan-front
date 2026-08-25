import type { ReactNode } from "react";

import { AppShell } from "@/components/layout";

/**
 * Application layout: navbar on top, content below.
 *
 * Covers public screens and, through the `(private)` group, also the ones
 * that require a session. Login and signup screens live in `(auth)`, which
 * has no navbar.
 */
export default function MainLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
