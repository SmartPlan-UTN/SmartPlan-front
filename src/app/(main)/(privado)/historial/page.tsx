import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/layout";

export const metadata: Metadata = {
  title: "Historial",
};

export default function PaginaHistorial() {
  return (
    <PantallaPendiente
      titulo="Historial"
      descripcion="Los planes generados y guardados, con su estado y la retroalimentación de cada uno."
      referencias="CU23 · PAN 13"
    />
  );
}
