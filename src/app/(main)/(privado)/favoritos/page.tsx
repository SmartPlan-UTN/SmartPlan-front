import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/layout";

export const metadata: Metadata = {
  title: "Favoritos",
};

export default function PaginaFavoritos() {
  return (
    <PantallaPendiente
      titulo="Favoritos"
      descripcion="Las solapas de actividades, planes y colecciones guardadas, cada una con su estado vacío."
      referencias="CU39–CU43 · PAN 12"
    />
  );
}
