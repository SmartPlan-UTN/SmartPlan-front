import type { ReactNode } from "react";

import { AdminShell } from "@/components/administration";
import { ProtectedRoute } from "@/components/auth";

/**
 * Layout for the administration panel.
 *
 * Uses the dedicated administration sidebar from the v2 system design and
 * requires a session. **The role check doesn't exist yet**: today
 * any valid session gets in. Restricting it to admin users is part of CU61
 * and CU62, which define permissions and roles.
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <ProtectedRoute>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}
