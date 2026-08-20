"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "@/lib/auth";
import { loginRoute } from "@/lib/routes";

import styles from "./auth.module.css";

export interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Guardián de las pantallas que exigen sesión.
 *
 * Mientras la sesión se resuelve muestra un status de espera; si no hay token,
 * reemplaza la input del history por `/login?redirect=<route>` para que el
 * botón "atrás" no devuelva a la pantalla de la que acaban de expulsarte.
 *
 * **Por qué la protección es del lado del client:** el JWT vive en
 * `localStorage`, que el servidor no ve, así que ni `proxy.ts` ni un Server
 * Component pueden decidir si hay sesión. Es una barrera de navegación, no de
 * seguridad: quien realmente autoriza es el back en cada request. Cuando el
 * token pase a una cookie `httpOnly` (decisión de CU1) esta comprobación se
 * puede mover al servidor sin tocar las pantallas.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useSession();
  const router = useRouter();
  const currentRoute = usePathname();

  useEffect(() => {
    if (status === "anonymous") {
      // Se guarda la route, no la query: leerla con `useSearchParams` obligaría
      // a envolver cada pantalla privada en un `<Suspense>` para que el build
      // no falle al prerenderizarlas. Cuando alguna pantalla dependa de sus
      // parámetros, se resuelve ahí.
      router.replace(loginRoute(currentRoute));
    }
  }, [status, router, currentRoute]);

  if (status === "authenticated") {
    return <>{children}</>;
  }

  return (
    <p className={styles.waiting} role="status">
      {status === "loading"
        ? "Verificando tu sesión…"
        : "Necesitás iniciar sesión para ver esta pantalla. Te llevamos al login…"}
    </p>
  );
}
