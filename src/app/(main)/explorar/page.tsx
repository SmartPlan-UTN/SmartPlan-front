import type { Metadata } from "next";

import { Contenedor, PantallaPendiente } from "@/components/layout";

export const metadata: Metadata = {
  title: "Explorar",
};

export default function PaginaExplorar() {
  return (
    <Contenedor>
      <PantallaPendiente
        titulo="Explorar"
        descripcion="Búsqueda de actividades y planes, con filtros, orden y la grilla de resultados."
        referencias="CU9–CU12 · PAN 11"
      />
    </Contenedor>
  );
}
