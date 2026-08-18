import type { ReactNode } from "react";

import { RutaProtegida } from "@/components/auth";
import { Contenedor } from "@/components/layout";

/**
 * Grupo de rutas que exige sesión.
 *
 * Todo lo que cuelga de `(privado)` queda protegido por estar acá: no hace
 * falta acordarse de envolver cada pantalla, y una pantalla nueva se protege
 * creándola dentro de la carpeta. El paréntesis hace que el grupo no aparezca
 * en la URL: `(main)/(privado)/favoritos` sigue siendo `/favoritos`.
 *
 * Estas pantallas son listados y formularios, así que el grupo también aporta
 * el `Contenedor`. Las públicas lo eligen ellas: el inicio va a fondo completo.
 */
export default function LayoutPrivado({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <RutaProtegida>
      <Contenedor>{children}</Contenedor>
    </RutaProtegida>
  );
}
