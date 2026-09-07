import type { ReactNode } from "react";

import { AdminShell } from "@/components/administration";
import { ProtectedRoute } from "@/components/auth";

/**
 * Layout for the administration panel.
 *
 * Uses the dedicated administration sidebar from the v2 system design and
 * requires an administrator session. The backend remains the authoritative
 * security boundary and checks role plus endpoint permissions.
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}
