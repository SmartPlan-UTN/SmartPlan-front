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
 * Guard for screens that require a session.
 *
 * While the session resolves it shows a waiting state; if there is no
 * token, it replaces the history entry with `/login?redirect=<route>` so
 * the "back" button doesn't return to the screen the user was just kicked
 * out of.
 *
 * **Why the protection is client-side:** the JWT lives in `localStorage`,
 * which the server can't see, so neither `proxy.ts` nor a Server Component
 * can decide whether there is a session. It's a navigation barrier, not a
 * security one: the backend is what actually authorizes on every request.
 * Once the token moves to an `httpOnly` cookie (CU1 decision), this check
 * can move to the server without touching the screens.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useSession();
  const router = useRouter();
  const currentRoute = usePathname();

  useEffect(() => {
    if (status === "anonymous") {
      // Store the route, not the query: reading it with `useSearchParams`
      // would force wrapping every private screen in a `<Suspense>` so the
      // build doesn't fail while prerendering them. If a screen ever needs
      // its own params, that's handled there.
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
