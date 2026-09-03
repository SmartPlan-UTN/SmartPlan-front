import { ApiError, normalizeError } from "@/lib/api";

/**
 * How selecting a plan (CU22) can fail. Each case has its own copy and its
 * own recovery: a domain change (403/404/409) means the plan's real state
 * moved on and the surface should reconcile with the server; a network or
 * unknown failure just needs another try.
 */
export type PlanSelectionErrorKind =
  | "not-found"
  | "not-yours"
  | "request-advanced"
  | "network"
  | "unknown";

export interface PlanSelectionError {
  kind: PlanSelectionErrorKind;
  /** User-facing, lifestyle tone — never a code or a stack. */
  message: string;
  /** The same request could plausibly succeed on a retry. */
  recoverable: boolean;
  /** The plan's real state changed; the surface should refetch. */
  reconcile: boolean;
}

const DOMAIN: Record<
  "not-found" | "not-yours" | "request-advanced",
  Omit<PlanSelectionError, "kind">
> = {
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
  "request-advanced": {
    message: "Este plan ya no se puede elegir.",
    recoverable: false,
    reconcile: true,
  },
};

/** Maps any thrown value from `selectPlan` into a typed, displayable error. */
export function toPlanSelectionError(error: unknown): PlanSelectionError {
  const api: ApiError =
    error instanceof ApiError ? error : normalizeError(error);

  if (api.status === 404) return { kind: "not-found", ...DOMAIN["not-found"] };
  if (api.status === 403) return { kind: "not-yours", ...DOMAIN["not-yours"] };
  if (api.code === "PLAN_REQUEST_ALREADY_ADVANCED" || api.status === 409) {
    return { kind: "request-advanced", ...DOMAIN["request-advanced"] };
  }
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
    message: "No pudimos elegir el plan. Probá de nuevo.",
    recoverable: true,
    reconcile: false,
  };
}
