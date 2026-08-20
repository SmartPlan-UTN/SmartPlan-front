import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";
import { REDIRECT_PARAM, safeDestination } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const value = parameters[REDIRECT_PARAM];
  // `safeDestination` descarta las URLs externas: sin ese filtro, `?redirect=`
  // convertiría al login en un redirector abierto a cualquier dominio.
  const destination = safeDestination(typeof value === "string" ? value : null);

  return (
    <PendingScreen
      title="Iniciar sesión"
      description="El formulario de acceso, el signup y el medidor de fortaleza de contraseña."
      referencias="CU1–CU3 · PAN 04"
      tono="dark"
    >
      {destination ? (
        <p className="sp-small">
          Cuando la sesión esté implementada, al iniciarla volvés a{" "}
          <strong>{destination}</strong>.
        </p>
      ) : null}
    </PendingScreen>
  );
}
