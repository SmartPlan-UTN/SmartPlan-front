"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { onUnauthorized, setTokenGetter } from "@/lib/api";

import { clearToken, saveToken, readToken, subscribeToSession } from "./session";

/**
 * Status de la sesión.
 *
 * `loading` es el status real del primer render: el token vive en el
 * navegador, así que el servidor no puede saber si hay sesión. Sin este status
 * intermedio el guardián expulsaría a todo el mundo al login por un instante.
 */
export type SessionStatus = "loading" | "authenticated" | "anonymous";

export interface Session {
  status: SessionStatus;
  token: string | null;
  /** Atajo de lectura: `status === "authenticated"`. */
  authenticated: boolean;
  /** Guarda el token emitido por el back y deja la sesión abierta (CU1). */
  iniciarSession: (token: string) => void;
  /** Borra el token local. La invalidación en el back es parte de CU4. */
  cerrarSession: () => void;
}

const SessionContext = createContext<Session | null>(null);

export interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Provee el status de sesión a toda la aplicación y mantiene sincronizado el
 * client HTTP.
 *
 * Hace tres cosas:
 *
 * 1. Lee el token al montar y escucha los changes (esta pestaña y las demás).
 * 2. Le enseña al client de `@/lib/api` de dónde sacar el token, con
 *    `setTokenGetter`, para que el interceptor de JWT no dependa de una key
 *    de `localStorage` escrita a mano.
 * 3. Cierra la sesión cuando la API responde 401, usando el bus de eventos que
 *    expone `onUnauthorized`.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const sincronizar = () => {
      const tokenActual = readToken();
      setToken(tokenActual);
      setStatus(tokenActual ? "authenticated" : "anonymous");
    };

    sincronizar();

    setTokenGetter(readToken);

    const unsubscribeSession = subscribeToSession(sincronizar);
    const unsubscribeUnauthorized = onUnauthorized(() => {
      clearToken();
    });

    return () => {
      unsubscribeSession();
      unsubscribeUnauthorized();
      setTokenGetter(null);
    };
  }, []);

  const iniciarSession = useCallback((nuevoToken: string) => {
    saveToken(nuevoToken);
  }, []);

  const cerrarSession = useCallback(() => {
    clearToken();
  }, []);

  const value = useMemo<Session>(
    () => ({
      status,
      token,
      authenticated: status === "authenticated",
      iniciarSession,
      cerrarSession,
    }),
    [status, token, iniciarSession, cerrarSession],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

/**
 * Devuelve la sesión active.
 *
 * @throws Si se usa fuera de `SessionProvider`. Es a propósito: un componente
 * que cree tener sesión y no la tenga falla de forma silenciosa y difícil de
 * rastrear.
 */
export function useSession(): Session {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error(
      "useSession() se usó fuera de <SessionProvider>. El provider se monta en src/app/layout.tsx.",
    );
  }

  return session;
}
