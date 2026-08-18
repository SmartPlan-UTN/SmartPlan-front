import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/layout";

export const metadata: Metadata = {
  title: "Administración",
};

export default function PaginaAdmin() {
  return (
    <PantallaPendiente
      titulo="Panel de administración"
      descripcion="Las métricas del sistema y la gestión de usuarios, actividades, planes y valoraciones."
      referencias="CU53–CU60 · REP-01"
    />
  );
}
