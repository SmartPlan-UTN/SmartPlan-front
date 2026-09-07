"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "@/lib/auth";
import { ROUTES, loginRoute } from "@/lib/routes";

import styles from "./auth.module.css";

export interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

/**
 * Guard for screens that require a session.
 *
 * While the session resolves it shows a waiting state; if there is no
 * token, it replaces the history entry with `/login?redirect=<route>` so
 * the "back" button doesn't return to the screen the user was just kicked
 * out of.
 *
 * **Why the protection is client-side:** the access token lives in memory,
 * which the server can't see, so neither `proxy.ts` nor a Server Component
 * can decide whether there is a session. It's a navigation barrier, not a
 * security one: the backend is what actually authorizes on every request.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { status, user } = useSession();
  const router = useRouter();
  const currentRoute = usePathname();

  useEffect(() => {
    if (status === "anonymous") {
      // Store the route, not the query: reading it with `useSearchParams`
      // would force wrapping every private screen in a `<Suspense>` so the
      // build doesn't fail while prerendering them. If a screen ever needs
      // its own params, that's handled there.
      router.replace(loginRoute(currentRoute));
    } else if (
      status === "authenticated" &&
      requiredRole &&
      user?.role.key !== requiredRole
    ) {
      router.replace(ROUTES.home);
    }
  }, [status, user, requiredRole, router, currentRoute]);

  if (
    status === "authenticated" &&
    (!requiredRole || user?.role.key === requiredRole)
  ) {
    return <>{children}</>;
  }

  const forbidden = status === "authenticated" && requiredRole;

  return (
    <p className={styles.waiting} role="status">
      {forbidden
        ? "No tenés permisos para ingresar al panel. Te llevamos al inicio…"
        : status === "loading"
        ? "Verificando tu sesión…"
        : "Necesitás iniciar sesión para ver esta pantalla. Te llevamos al login…"}
    </p>
  );
}
