import type { ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth";
import { AppShell, Container } from "@/components/layout";

/**
 * Layout del panel de administración.
 *
 * Comparte la navbar con el resto de la aplicación y exige sesión, igual que el
 * grupo `(private)`. **La comprobación de role todavía no existe**: hoy cualquier
 * sesión válida entra. Restringirlo a la persona administradora es parte de
 * CU61 y CU62, que definen permissions y roles.
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
