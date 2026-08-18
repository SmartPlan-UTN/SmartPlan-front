import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/layout";

export const metadata: Metadata = {
  title: "Mi perfil",
};

export default function PaginaPerfil() {
  return (
    <PantallaPendiente
      titulo="Mi perfil"
      descripcion="Los datos personales con validación inline, el cambio de contraseña y la baja de cuenta."
      referencias="CU5–CU7 · PAN 14"
    />
  );
}
