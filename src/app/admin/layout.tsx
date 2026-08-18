import type { ReactNode } from "react";

import { RutaProtegida } from "@/components/auth";
import { CascaraApp } from "@/components/layout";

/**
 * Layout del panel de administración.
 *
 * Comparte la navbar con el resto de la aplicación y exige sesión, igual que el
 * grupo `(privado)`. **La comprobación de rol todavía no existe**: hoy cualquier
 * sesión válida entra. Restringirlo a la persona administradora es parte de
 * CU61 y CU62, que definen permisos y roles.
 */
export default function LayoutAdmin({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <CascaraApp>
      <RutaProtegida>{children}</RutaProtegida>
    </CascaraApp>
  );
}
