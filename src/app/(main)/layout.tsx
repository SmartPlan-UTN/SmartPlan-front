import type { ReactNode } from "react";

import { AppShell } from "@/components/layout";

/**
 * Layout de la aplicación: navbar arriba y contenido debajo.
 *
 * Cubre las pantallas públicas y, a través del grupo `(private)`, también las
 * que exigen sesión. Las pantallas de login y signup viven en `(auth)`, que
 * no lleva navbar.
 */
export default function MainLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
