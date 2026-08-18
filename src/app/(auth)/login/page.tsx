import type { Metadata } from "next";

import { PantallaPendiente } from "@/components/layout";
import { PARAM_REDIRECT, destinoSeguro } from "@/lib/rutas";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

interface PaginaLoginProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PaginaLogin({ searchParams }: PaginaLoginProps) {
  const parametros = await searchParams;
  const valor = parametros[PARAM_REDIRECT];
  // `destinoSeguro` descarta las URLs externas: sin ese filtro, `?redirect=`
  // convertiría al login en un redirector abierto a cualquier dominio.
  const destino = destinoSeguro(typeof valor === "string" ? valor : null);

  return (
    <PantallaPendiente
      titulo="Iniciar sesión"
      descripcion="El formulario de acceso, el registro y el medidor de fortaleza de contraseña."
      referencias="CU1–CU3 · PAN 04"
      tono="oscuro"
    >
      {destino ? (
        <p className="sp-small">
          Cuando la sesión esté implementada, al iniciarla volvés a{" "}
          <strong>{destino}</strong>.
        </p>
      ) : null}
    </PantallaPendiente>
  );
}
