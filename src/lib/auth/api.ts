import { apiClient } from "@/lib/api";

/**
 * Authentication calls against SmartPlan-back (CU1-CU4).
 *
 * Contract source: `frontend-authentication-integration.md`
 * (SmartPlan-back docs, shared out of band — not part of this repo).
 * Session endpoints live under `/sessions`, not `/auth`: `POST /sessions`
 * opens a session, `POST /sessions/refresh` renews it from the refresh
 * cookie, `DELETE /sessions` closes it (CU4).
 */

/** User data returned alongside the access token. */
export interface AuthenticatedUser {
  id: number;
  name: string;
  lastName: string;
  email: string;
  role: { key: string; name: string };
  permissions: string[];
}

/**
 * Shared response shape for every endpoint that opens or renews a session
 * (login, registration, refresh).
 */
export interface AuthenticationResponse {
  accessToken: string;
  tokenType: "Bearer";
  /** Access token lifetime in seconds (900 = 15 minutes). */
  expiresIn: number;
  user: AuthenticatedUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  name: string;
  lastName: string;
  email: string;
  password: string;
}

/**
 * CU1: opens a session.
 *
 * `POST /sessions`. On success the backend also sets the `smartplan_refresh`
 * cookie (`HttpOnly`); the frontend never reads or stores it directly, it
 * relies on `withCredentials` to send it back automatically.
 */
export async function login(
  credentials: LoginCredentials,
): Promise<AuthenticationResponse> {
  return apiClient.post<AuthenticationResponse>("/sessions", credentials);
}

/**
 * Rehydrates the session from the refresh cookie.
 *
 * `POST /sessions/refresh`. Called once on app startup, since the access
 * token lives only in memory and doesn't survive a page reload on its own.
 * Rejects with an `ApiError` (401) when there is no valid refresh cookie,
 * which the caller treats as "anonymous", not as a failure to report.
 */
export async function refreshSession(): Promise<AuthenticationResponse> {
  return apiClient.post<AuthenticationResponse>("/sessions/refresh");
}

/**
 * CU2: creates an account.
 *
 * `POST /users` — a plain resource-creation endpoint, not under `/sessions`,
 * but it opens a session on success just like `login` does: same
 * `AuthenticationResponse` shape, same `smartplan_refresh` cookie.
 */
export async function register(
  data: RegistrationData,
): Promise<AuthenticationResponse> {
  return apiClient.post<AuthenticationResponse>("/users", data);
}
