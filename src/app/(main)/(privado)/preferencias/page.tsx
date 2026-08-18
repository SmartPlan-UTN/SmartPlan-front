import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/layout";

export const metadata: Metadata = {
  title: "Preferencias",
};

export default function PaginaPreferencias() {
  return (
    <PantallaPendiente
      titulo="Preferencias"
      descripcion="Las categorías de interés, el presupuesto habitual y la zona con la que arrancan tus planes."
      referencias="CU8, CU18 · PAN 15"
    />
  );
}
