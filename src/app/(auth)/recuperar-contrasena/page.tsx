import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/layout";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function PaginaRecuperarContrasena() {
  return (
    <PantallaPendiente
      titulo="Recuperar contraseña"
      descripcion="El pedido del enlace de recuperación y el cambio de contraseña con token."
      referencias="CU3 · PAN 05"
      tono="oscuro"
    />
  );
}
