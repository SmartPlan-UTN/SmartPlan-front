import type { ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth";
import { Container } from "@/components/layout";

/**
 * Grupo de rutas que exige sesión.
 *
 * Todo lo que cuelga de `(private)` queda protegido por estar acá: no hace
 * falta acordarse de envolver cada pantalla, y una pantalla nueva se protege
 * creándola dentro de la carpeta. El paréntesis hace que el grupo no aparezca
 * en la URL: `(main)/(private)/favorites` sigue siendo `/favorites`.
 *
 * Estas pantallas son listados y formularios, así que el grupo también aporta
 * el `Container`. Las públicas lo eligen ellas: el home va a fondo completo.
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
