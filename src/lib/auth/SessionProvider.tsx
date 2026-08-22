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
 * Session state.
 *
 * `loading` is the real state on the first render: the token lives in the
 * browser, so the server has no way to know whether there is a session.
 * Without this intermediate state, the guard would kick everyone to login
 * for an instant.
 */
export type SessionStatus = "loading" | "authenticated" | "anonymous";

export interface Session {
  status: SessionStatus;
  token: string | null;
  /** Shorthand: `status === "authenticated"`. */
  authenticated: boolean;
  /** Saves the token issued by the backend and opens the session (CU1). */
  login: (token: string) => void;
  /** Clears the local token. Backend-side invalidation is part of CU4. */
  logout: () => void;
}

const SessionContext = createContext<Session | null>(null);

export interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Provides the session state to the whole application and keeps the HTTP
 * client in sync.
 *
 * It does three things:
 *
 * 1. Reads the token on mount and listens for changes (this tab and others).
 * 2. Tells the `@/lib/api` client where to get the token from, via
 *    `setTokenGetter`, so the JWT interceptor doesn't depend on a
 *    hand-written `localStorage` key.
 * 3. Closes the session when the API responds with 401, using the event bus
 *    exposed by `onUnauthorized`.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const currentToken = readToken();
      setToken(currentToken);
      setStatus(currentToken ? "authenticated" : "anonymous");
    };

    sync();

    setTokenGetter(readToken);

    const unsubscribeSession = subscribeToSession(sync);
    const unsubscribeUnauthorized = onUnauthorized(() => {
      clearToken();
    });

    return () => {
      unsubscribeSession();
      unsubscribeUnauthorized();
      setTokenGetter(null);
    };
  }, []);

  const login = useCallback((newToken: string) => {
    saveToken(newToken);
  }, []);

  const logout = useCallback(() => {
    clearToken();
  }, []);

  const value = useMemo<Session>(
    () => ({
      status,
      token,
      authenticated: status === "authenticated",
      login,
      logout,
    }),
    [status, token, login, logout],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

/**
 * Returns the active session.
 *
 * @throws If used outside `SessionProvider`. This is intentional: a
 * component that assumes it has a session when it doesn't fails silently
 * and is hard to trace.
 */
export function useSession(): Session {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error(
      "useSession() was used outside <SessionProvider>. The provider is mounted in src/app/layout.tsx.",
    );
  }

  return session;
}
