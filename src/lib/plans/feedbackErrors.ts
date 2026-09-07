import { ApiError, normalizeError } from "@/lib/api";

/**
 * How submitting plan feedback (CU23) can fail. A domain change — feedback
 * already exists, or the window is not open — means the surface should
 * reconcile with the server (the CTA shouldn't have been there). A network or
 * unknown failure just needs another try; the form keeps what the user typed.
 */
export type FeedbackErrorKind =
  | "already-submitted"
  | "not-available"
  | "not-found"
  | "not-yours"
  | "network"
  | "unknown";

export interface FeedbackError {
  kind: FeedbackErrorKind;
  /** User-facing, lifestyle tone — never a code or a stack. */
  message: string;
  /** The same request could plausibly succeed on a retry. */
  recoverable: boolean;
  /** The plan's real feedback state changed; the surface should refetch. */
  reconcile: boolean;
}

const DOMAIN: Record<
  "already-submitted" | "not-available" | "not-found" | "not-yours",
  Omit<FeedbackError, "kind">
> = {
  "already-submitted": {
    message: "Ya registraste tu experiencia para este plan.",
    recoverable: false,
    reconcile: true,
  },
  "not-available": {
    message: "Todavía no podés calificar este plan.",
    recoverable: false,
    reconcile: true,
  },
  "not-found": {
    message: "Este plan ya no está disponible.",
    recoverable: false,
    reconcile: true,
  },
  "not-yours": {
    message: "Este plan no es tuyo.",
    recoverable: false,
    reconcile: true,
  },
};

/** Maps any thrown value from `submitFeedback` into a typed, displayable error. */
export function toFeedbackError(error: unknown): FeedbackError {
  const api: ApiError =
    error instanceof ApiError ? error : normalizeError(error);

  if (api.code === "FEEDBACK_ALREADY_SUBMITTED") {
    return { kind: "already-submitted", ...DOMAIN["already-submitted"] };
  }
  if (api.code === "FEEDBACK_NOT_YET_AVAILABLE") {
    return { kind: "not-available", ...DOMAIN["not-available"] };
  }
  if (api.status === 404) return { kind: "not-found", ...DOMAIN["not-found"] };
  if (api.status === 403) return { kind: "not-yours", ...DOMAIN["not-yours"] };
  if (api.isNetworkError) {
    return {
      kind: "network",
      message: "Se cortó la conexión. Probá de nuevo.",
      recoverable: true,
      reconcile: false,
    };
  }
  return {
    kind: "unknown",
    message: "No pudimos guardar tu opinión. Probá de nuevo.",
    recoverable: true,
    reconcile: false,
  };
}
