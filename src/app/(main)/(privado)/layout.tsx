import type { ReactNode } from "react";

import { RutaProtegida } from "@/components/auth";

/**
 * Grupo de rutas que exige sesión.
 *
 * Todo lo que cuelga de `(privado)` queda protegido por estar acá: no hace
 * falta acordarse de envolver cada pantalla, y una pantalla nueva se protege
 * creándola dentro de la carpeta. El paréntesis hace que el grupo no aparezca
 * en la URL: `(main)/(privado)/favoritos` sigue siendo `/favoritos`.
 */
export default function LayoutPrivado({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <RutaProtegida>{children}</RutaProtegida>;
}
