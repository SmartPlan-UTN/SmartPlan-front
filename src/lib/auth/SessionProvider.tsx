"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { onUnauthorized, setTokenGetter } from "@/lib/api";

import {
  login as requestLogin,
  logout as requestLogout,
  refreshSession,
  register as requestRegister,
  type AuthenticatedUser,
  type AuthenticationResponse,
  type LoginCredentials,
  type RegistrationData,
} from "./api";

export type { AuthenticatedUser, LoginCredentials, RegistrationData };

/**
 * Session state.
 *
 * `loading` is the real state on the first render: the access token lives
 * only in memory (never in `localStorage`, never in a readable cookie), so
 * on a page reload it's rebuilt from the `smartplan_refresh` httpOnly
 * cookie via `POST /sessions/refresh`. Without this intermediate state, the
 * guard would kick everyone to login while that request is in flight.
 */
export type SessionStatus = "loading" | "authenticated" | "anonymous";

export interface Session {
  status: SessionStatus;
  user: AuthenticatedUser | null;
  /** Shorthand: `status === "authenticated"`. */
  authenticated: boolean;
  /**
   * Opens a session (CU1): calls `POST /sessions` and, on success, stores
   * the access token and the user in memory. Resolves with the user, so a
   * caller like the login form can decide where to redirect (e.g. an admin
   * account) without waiting for a re-render to read it back from context.
   * Rejects with the `ApiError` thrown by the request so the form can map
   * it to a message.
   */
  login: (credentials: LoginCredentials) => Promise<AuthenticatedUser>;
  /**
   * Creates an account (CU2): calls `POST /users` and, on success, opens a
   * session with the response — registering logs the account in immediately,
   * the same way `login` does. Rejects with the `ApiError` thrown by the
   * request so the form can map it to a message.
   */
  register: (data: RegistrationData) => Promise<AuthenticatedUser>;
  /**
   * Closes the session (CU4): calls `DELETE /sessions`, best-effort, then
   * always clears local state — a network error or an already-invalid
   * cookie shouldn't trap someone in a session they can't leave from the
   * UI. Never rejects.
   */
  logout: () => Promise<void>;
  /**
   * Applies a fresh `AuthenticationResponse` without making a request of
   * its own — for an endpoint that reissues this session's tokens as a
   * side effect of something else, like CU6's `changePassword`, whose
   * response is the same shape as login/refresh. Doesn't touch the refresh
   * cookie: the endpoint that returned `response` already wrote it.
   */
  applyAuthentication: (response: AuthenticationResponse) => void;
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
 * 1. On mount, calls `POST /sessions/refresh` to rehydrate the session from
 *    the refresh cookie, since the access token itself doesn't survive a
 *    reload.
 * 2. Tells the `@/lib/api` client where to get the token from, via
 *    `setTokenGetter`, reading it from a ref so the interceptor always sees
 *    the latest value without resubscribing.
 * 3. Closes the session when the API responds with 401 on some other
 *    request, using the event bus exposed by `onUnauthorized`. There is no
 *    automatic silent-refresh-and-retry: a 401 mid-session logs the user
 *    out, same as an expired session would.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const tokenRef = useRef<string | null>(null);

  const applyAuthenticated = useCallback((response: AuthenticationResponse) => {
    tokenRef.current = response.accessToken;
    setUser(response.user);
    setStatus("authenticated");
  }, []);

  const applyAnonymous = useCallback(() => {
    tokenRef.current = null;
    setUser(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    let cancelled = false;

    setTokenGetter(() => tokenRef.current);

    refreshSession()
      .then((response) => {
        if (!cancelled) {
          applyAuthenticated(response);
        }
      })
      .catch(() => {
        // No valid refresh cookie (never logged in, expired, or revoked):
        // this is the normal anonymous case, not an error to surface.
        if (!cancelled) {
          applyAnonymous();
        }
      });

    const unsubscribeUnauthorized = onUnauthorized(() => {
      applyAnonymous();
    });

    return () => {
      cancelled = true;
      unsubscribeUnauthorized();
      setTokenGetter(null);
    };
  }, [applyAuthenticated, applyAnonymous]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const response = await requestLogin(credentials);
      applyAuthenticated(response);
      return response.user;
    },
    [applyAuthenticated],
  );

  const register = useCallback(
    async (data: RegistrationData) => {
      const response = await requestRegister(data);
      applyAuthenticated(response);
      return response.user;
    },
    [applyAuthenticated],
  );

  const logout = useCallback(async () => {
    try {
      await requestLogout();
    } catch {
      // Best-effort: an expired/already-cleared cookie or a network error
      // shouldn't stop the local session from closing.
    } finally {
      applyAnonymous();
    }
  }, [applyAnonymous]);

  const value = useMemo<Session>(
    () => ({
      status,
      user,
      authenticated: status === "authenticated",
      login,
      register,
      logout,
      applyAuthentication: applyAuthenticated,
    }),
    [status, user, login, register, logout, applyAuthenticated],
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
