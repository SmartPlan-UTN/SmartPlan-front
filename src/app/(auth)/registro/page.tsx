import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/layout";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function PaginaRegistro() {
  return (
    <PantallaPendiente
      titulo="Crear cuenta"
      descripcion="El alta de usuario con validación inline y el medidor de fortaleza de contraseña."
      referencias="CU2 · PAN 04"
      tono="oscuro"
    />
  );
}
