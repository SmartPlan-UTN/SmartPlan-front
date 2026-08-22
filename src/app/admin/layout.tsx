import type { ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth";
import { AppShell, Container } from "@/components/layout";

/**
 * Layout for the administration panel.
 *
 * Shares the navbar with the rest of the application and requires a session,
 * same as the `(private)` group. **The role check doesn't exist yet**: today
 * any valid session gets in. Restricting it to admin users is part of CU61
 * and CU62, which define permissions and roles.
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <AppShell>
      <ProtectedRoute>
        <Container>{children}</Container>
      </ProtectedRoute>
    </AppShell>
  );
}
