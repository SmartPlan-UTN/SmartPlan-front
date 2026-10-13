import type { AdminPlan, PlanKind, PlanStatusKey, PlanVisibility } from "@/types";

/**
 * How PAN 19 (Administración de Planes) explains a plan (#160): its
 * operational status, where it comes from, and whether Explorar shows it.
 *
 * Status and visibility are independent on purpose. A plan's status tracks
 * what happened to it (generated → completed); its visibility is the author's
 * decision to publish it. Explorar lists only `authored` + `public` plans
 * that aren't `cancelled` — the same rule `createSearchBuilder` applies in
 * `SmartPlan-back` — so a `completed` plan alone never makes it public.
 */

interface Copy {
  label: string;
  description: string;
}

export const PLAN_STATUS_COPY: Record<PlanStatusKey, Copy> = {
  generated: {
    label: "Generado",
    description: "Propuesta creada o generada que todavía nadie eligió.",
  },
  selected: {
    label: "Seleccionado",
    description: "Su dueño lo marcó como el plan que quiere hacer.",
  },
  confirmed: {
    label: "Confirmado",
    description: "Confirmado para realizarse.",
  },
  completed: {
    label: "Completado",
    description: "Ya se realizó. No cambia su visibilidad.",
  },
  cancelled: {
    label: "Cancelado",
    description: "Se dio de baja. Nunca aparece en Explorar.",
  },
};

export const PLAN_KIND_COPY: Record<PlanKind, Copy> = {
  authored: {
    label: "Creado por una persona",
    description: "Vive en Mis planes y su autor puede publicarlo.",
  },
  generated: {
    label: "Resultado generado",
    description: "Alternativa de una solicitud de Planificar. Es personal y no se publica.",
  },
  outing: {
    label: "Salida",
    description: "Copia personal de un plan que alguien eligió hacer. No se publica.",
  },
};

export const PLAN_VISIBILITY_LABEL: Record<PlanVisibility, string> = {
  public: "Público",
  private: "Privado",
};

export const PLAN_STATUS_OPTIONS: Array<{ value: PlanStatusKey; label: string }> = (
  Object.keys(PLAN_STATUS_COPY) as PlanStatusKey[]
).map((value) => ({ value, label: PLAN_STATUS_COPY[value].label }));

export const PLAN_KIND_OPTIONS: Array<{ value: PlanKind; label: string }> = (
  Object.keys(PLAN_KIND_COPY) as PlanKind[]
).map((value) => ({ value, label: PLAN_KIND_COPY[value].label }));

export const PLAN_VISIBILITY_OPTIONS: Array<{ value: PlanVisibility; label: string }> = (
  Object.keys(PLAN_VISIBILITY_LABEL) as PlanVisibility[]
).map((value) => ({ value, label: PLAN_VISIBILITY_LABEL[value] }));

export interface ExplorePresence {
  visible: boolean;
  reason: string;
}

/** Whether Explorar > Planes lists this plan, and why not when it doesn't. */
export function explorePresence(
  plan: Pick<AdminPlan, "kind" | "visibility" | "status">,
): ExplorePresence {
  if (plan.kind === "generated") {
    return { visible: false, reason: "Los resultados generados no se publican." };
  }
  if (plan.kind === "outing") {
    return { visible: false, reason: "Las salidas son personales." };
  }
  if (plan.visibility === "private") {
    return { visible: false, reason: "Su autor no lo publicó." };
  }
  if (plan.status.key === "cancelled") {
    return { visible: false, reason: "Los planes cancelados no se muestran." };
  }
  return { visible: true, reason: "Visible en Explorar" };
}
