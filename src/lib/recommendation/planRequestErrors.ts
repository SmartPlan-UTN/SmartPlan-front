import { ApiError } from "@/lib/api";

/**
 * How a surprise plan request can fail before or during generation (CU19 ·
 * PAN 09). Each case gets its own copy and its own set of offered actions —
 * a denied location is a different situation from a provider outage, and the
 * spec writes distinct messages for them.
 */
export type SurpriseLocationErrorKind =
  | "denied-no-fallback"
  | "unavailable-no-fallback"
  | "unsupported"
  | "no-location";

export type SurpriseErrorAction =
  | "retry"
  | "keep-waiting"
  | "go-back"
  | "go-preferences";

export interface SurpriseErrorCopy {
  title: string;
  body: string;
  actions: SurpriseErrorAction[];
}

const NEEDS_LOCATION: SurpriseErrorCopy = {
  title: "Necesitamos tu ubicación para sorprenderte.",
  body: "Activá el GPS o configurá una ubicación en tus preferencias.",
  actions: ["go-preferences", "retry"],
};

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
 * Copy for a location problem raised on the client, before any request was
 * created. `denied` / `unavailable` only reach here when there is also no
 * usable preferred area to fall back to.
 */
export function surpriseLocationErrorCopy(
  kind: SurpriseLocationErrorKind,
): SurpriseErrorCopy {
  switch (kind) {
    case "unsupported":
      return {
        title: "Tu navegador no permite compartir la ubicación.",
        body: "Configurá una ubicación en tus preferencias para usar Sorpréndeme.",
        actions: ["go-preferences"],
      };
    case "denied-no-fallback":
    case "unavailable-no-fallback":
    case "no-location":
      return NEEDS_LOCATION;
  }
}

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
    case "NO_LOCATION_AVAILABLE":
      return NOT_ENOUGH_ACTIVITIES;
    case "NO_VALID_COMBINATIONS":
      return NOT_ENOUGH_ACTIVITIES;
    case "TOO_MANY_ACTIVE_REQUESTS":
      return {
        title: "Ya tenés varios planes generándose.",
        body: "Esperá a que termine alguno antes de pedir otro.",
        actions: ["go-back"],
      };
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
