import { ApiError, normalizeError } from "@/lib/api";

/**
 * How "Lo voy a hacer" (CU22) can fail. Each case has its own copy and its
 * own recovery: a domain change (404/409) means the plan's real state moved
 * on — it was unpublished, cancelled, or is not choosable — and the surface
 * should reconcile with the server; a network or unknown failure just needs
 * another try.
 */
export type PlanSelectionErrorKind =
  | "not-found"
  | "not-actionable"
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
  "not-found" | "not-actionable",
  Omit<PlanSelectionError, "kind">
> = {
  "not-found": {
    message: "Este plan ya no está disponible.",
    recoverable: false,
    reconcile: true,
  },
  "not-actionable": {
    message: "Este plan ya no se puede elegir.",
    recoverable: false,
    reconcile: true,
  },
};

/** Maps any thrown value from `createOuting` into a typed, displayable error. */
export function toPlanSelectionError(error: unknown): PlanSelectionError {
  const api: ApiError =
    error instanceof ApiError ? error : normalizeError(error);

  if (api.status === 404) return { kind: "not-found", ...DOMAIN["not-found"] };
  if (api.status === 409) {
    return { kind: "not-actionable", ...DOMAIN["not-actionable"] };
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
