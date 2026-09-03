import { ApiError, normalizeError } from "@/lib/api";

/**
 * How dismissing / undoing a recommendation (CU21) can fail.
 *
 * - `reconcile` — the plan is gone or was never dismissed; the rail is stale
 *   and should just accept the outcome (no retry, no error shown).
 * - `retry` — a network or unknown hiccup; nothing changed on the server, the
 *   card can be put back and the action offered again.
 */
export type DismissErrorKind = "reconcile" | "retry";

export interface DismissError {
  kind: DismissErrorKind;
  /** User-facing, lifestyle tone — never a code or a stack. */
  message: string;
}

/** Maps any thrown value from the dismiss endpoints into a typed outcome. */
export function toDismissError(error: unknown): DismissError {
  const api: ApiError =
    error instanceof ApiError ? error : normalizeError(error);

  // 404 (plan gone) and 403 (somehow not dismissable) are not worth a retry —
  // the rail will refresh itself on the next load.
  if (api.status === 404 || api.status === 403) {
    return {
      kind: "reconcile",
      message: "Ese plan ya no está entre tus recomendaciones.",
    };
  }

  return {
    kind: "retry",
    message: "No pudimos actualizarlo. Probá de nuevo.",
  };
}
