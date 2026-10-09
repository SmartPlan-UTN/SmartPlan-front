import { ApiError } from "@/lib/api";

/**
 * How a surprise plan request can fail during generation (CU19 · PAN 09).
 * Resolving a location on the client is never an error any more — the
 * backend generates a plan even without one (falls back to a sensible
 * department) — so only genuine backend/provider failures are covered here.
 */
export type SurpriseErrorAction = "retry" | "keep-waiting" | "go-back";

export interface SurpriseErrorCopy {
  title: string;
  body: string;
  actions: SurpriseErrorAction[];
}

const NOT_ENOUGH_ACTIVITIES: SurpriseErrorCopy = {
  title: "No encontramos suficientes actividades cerca de tu ubicación.",
  body: "Intentá en otro momento o explorá otras zonas.",
  actions: ["retry", "go-back"],
};

const GENERATION_ERROR: SurpriseErrorCopy = {
  title: "Ocurrió un error al generar el plan sorpresa.",
  body: "Por favor intentá de nuevo en unos momentos.",
  actions: ["retry", "go-back"],
};

/**
 * Copy for a failure that came back from the API — either synchronously from
 * the `POST /plan-requests/surprise` call, or as a terminal `failed` status
 * during polling (`failureCode`). Internal provider details (Gemini, Maps)
 * are never surfaced.
 */
export function surpriseGenerationErrorCopy(input: {
  code?: string | null;
  error?: ApiError | null;
}): SurpriseErrorCopy {
  const code = input.code ?? input.error?.code ?? null;

  switch (code) {
    case "NO_VALID_COMBINATIONS":
      return NOT_ENOUGH_ACTIVITIES;
    case "TOO_MANY_ACTIVE_REQUESTS":
      return {
        title: "Ya tenés varios planes generándose.",
        body: "Esperá a que termine alguno antes de pedir otro.",
        actions: ["go-back"],
      };
    case "GENERATION_PROVIDER_UNAVAILABLE":
      return GENERATION_ERROR;
    default:
      break;
  }

  if (input.error?.isNetworkError) {
    return {
      title: "Se cortó la conexión.",
      body: "Revisá tu internet e intentá de nuevo.",
      actions: ["retry", "go-back"],
    };
  }

  return GENERATION_ERROR;
}

/** Copy for the frontend-only display timeout (the request is still alive). */
export const SURPRISE_TIMEOUT_COPY: SurpriseErrorCopy = {
  title: "La sorpresa está tardando un poco más de lo esperado.",
  body: "Tu pedido sigue en marcha.",
  actions: ["keep-waiting", "go-back"],
};
