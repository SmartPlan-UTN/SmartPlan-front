"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSesion } from "@/lib/auth";
import { rutaLogin } from "@/lib/rutas";

import styles from "./auth.module.css";

export interface RutaProtegidaProps {
  children: ReactNode;
}

/**
 * Guardián de las pantallas que exigen sesión.
 *
 * Mientras la sesión se resuelve muestra un estado de espera; si no hay token,
 * reemplaza la entrada del historial por `/login?redirect=<ruta>` para que el
 * botón "atrás" no devuelva a la pantalla de la que acaban de expulsarte.
 *
 * **Por qué la protección es del lado del cliente:** el JWT vive en
 * `localStorage`, que el servidor no ve, así que ni `proxy.ts` ni un Server
 * Component pueden decidir si hay sesión. Es una barrera de navegación, no de
 * seguridad: quien realmente autoriza es el back en cada request. Cuando el
 * token pase a una cookie `httpOnly` (decisión de CU1) esta comprobación se
 * puede mover al servidor sin tocar las pantallas.
 */
export function RutaProtegida({ children }: RutaProtegidaProps) {
  const { estado } = useSesion();
  const router = useRouter();
  const rutaActual = usePathname();

  useEffect(() => {
    if (estado === "anonimo") {
      // Se guarda la ruta, no la query: leerla con `useSearchParams` obligaría
      // a envolver cada pantalla privada en un `<Suspense>` para que el build
      // no falle al prerenderizarlas. Cuando alguna pantalla dependa de sus
      // parámetros, se resuelve ahí.
      router.replace(rutaLogin(rutaActual));
    }
  }, [estado, router, rutaActual]);

  if (estado === "autenticado") {
    return <>{children}</>;
  }

  return (
    <p className={styles.esperando} role="status">
      {estado === "cargando"
        ? "Verificando tu sesión…"
        : "Necesitás iniciar sesión para ver esta pantalla. Te llevamos al login…"}
    </p>
  );
}
