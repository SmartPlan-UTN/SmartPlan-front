import { ApiError } from "@/lib/api";

import type { ComposerStep } from "./ComposerStepper";

export interface SaveFailure {
  message: string;
  /** Step where the person can fix it, when there is one. */
  step?: ComposerStep;
  /** The server saw this request id with a different payload: use a new one. */
  newRequestId?: boolean;
}

const GENERIC =
  "No pudimos guardar el plan. Tu borrador sigue acá; revisá tu conexión e intentá de nuevo.";

/**
 * Turns what the server (or the network) said into something the person can
 * act on. The draft is never touched: every failure keeps it for a retry.
 */
export function mapSaveError(error: unknown): SaveFailure {
  if (!(error instanceof ApiError)) return { message: GENERIC };

  switch (error.code) {
    case "PLAN_COMPOSER_REQUEST_REUSED":
      return {
        message:
          "Este intento ya se había enviado con otros datos. Volvé a guardar y lo resolvemos.",
        newRequestId: true,
      };
    case "ACTIVITY_NOT_FOUND":
      return {
        message:
          "Alguna actividad del recorrido ya no está disponible. Revisá las paradas y quitá la que haya cambiado.",
        step: 1,
      };
    case "DUPLICATE_ACTIVITY_IN_PLAN":
    case "ACTIVITY_ALREADY_IN_PLAN":
      return {
        message: "Hay una actividad repetida en el recorrido. Quitá una de las dos.",
        step: 1,
      };
    case "INVALID_PLAN_DETAIL_REFERENCE":
    case "INVALID_NEW_PLAN_DETAIL_REFERENCE":
      return {
        message:
          "El recorrido cambió desde que lo abriste. Volvé a abrir el plan para seguir editando.",
      };
    case "PLAN_NOT_EDITABLE_IN_COMPOSER":
    case "PLAN_CANCELLED":
      return { message: "Este plan ya no se puede editar desde acá." };
    default:
      break;
  }

  if (error.isUnauthorized || error.isForbidden) {
    return {
      message:
        "Tu sesión no permite guardar este plan. Volvé a iniciar sesión; el borrador sigue acá.",
    };
  }
  if (error.status === 400) {
    return {
      message:
        "Algún dato del plan no es válido. Revisá el nombre, la nota y la cantidad de personas.",
      step: 0,
    };
  }
  return { message: GENERIC };
}
