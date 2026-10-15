import { ApiError, normalizeError } from "@/lib/api";

/**
 * How reporting content (#156) can fail. Some failures still mean the
 * content should leave the reporter's view: they already reported it, or it
 * is gone. The rest keep the dialog open, with what they wrote, to retry.
 */
export type ReportErrorKind =
  | "already-reported"
  | "own-content"
  | "not-found"
  | "network"
  | "unknown";

export interface ReportError {
  kind: ReportErrorKind;
  /** User-facing, never a code or a stack. */
  message: string;
  /** The content should disappear from the reporter's view anyway. */
  dismiss: boolean;
}

/** Maps any thrown value from `reportContent` into a displayable error. */
export function toReportError(error: unknown): ReportError {
  const api: ApiError = error instanceof ApiError ? error : normalizeError(error);

  if (api.code === "CONTENT_REPORT_DUPLICATE" || api.status === 409) {
    return {
      kind: "already-reported",
      message: "Ya denunciaste este contenido.",
      dismiss: true,
    };
  }
  if (api.code === "CONTENT_REPORT_OWN_CONTENT") {
    return {
      kind: "own-content",
      message: "No podés denunciar tu propio contenido.",
      dismiss: false,
    };
  }
  if (api.status === 404) {
    return {
      kind: "not-found",
      message: "Este contenido ya no está disponible.",
      dismiss: true,
    };
  }
  if (api.isNetworkError) {
    return {
      kind: "network",
      message: "Se cortó la conexión. Probá de nuevo.",
      dismiss: false,
    };
  }
  return {
    kind: "unknown",
    message: "No pudimos enviar la denuncia. Probá de nuevo.",
    dismiss: false,
  };
}

/** Maps a failure of the administrator's queue or decision to a message. */
export function moderationErrorMessage(error: unknown, fallback: string): string {
  const api: ApiError = error instanceof ApiError ? error : normalizeError(error);
  if (api.code === "CONTENT_REPORT_NOT_FOUND" || api.status === 404) {
    return "Esta denuncia ya fue resuelta. Actualizamos la lista.";
  }
  if (api.isForbidden) return "No tenés permisos para moderar contenido.";
  if (api.isNetworkError) return "Se cortó la conexión. Probá de nuevo.";
  return fallback;
}
