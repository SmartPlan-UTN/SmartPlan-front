/**
 * Frontend session state.
 *
 * Always import from `@/lib/auth`, not from the internal files.
 */

export { SessionProvider, useSession } from "./SessionProvider";
export type {
  SessionStatus,
  Session,
  SessionProviderProps,
  AuthenticatedUser,
  LoginCredentials,
} from "./SessionProvider";
