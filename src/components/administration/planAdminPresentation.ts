import { VISIBILITY_COPY } from "@/components/plan/visibilityContent";
import type { AdminPlan, PlanKind, PlanStatusKey, PlanVisibility } from "@/types";

/**
 * How PAN 22 (Administración de Planes) explains a plan (#160): its
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

export const PLAN_STATUS_OPTIONS: Array<{ value: PlanStatusKey; label: string }> = (
  Object.keys(PLAN_STATUS_COPY) as PlanStatusKey[]
).map((value) => ({ value, label: PLAN_STATUS_COPY[value].label }));

export const PLAN_KIND_OPTIONS: Array<{ value: PlanKind; label: string }> = (
  Object.keys(PLAN_KIND_COPY) as PlanKind[]
).map((value) => ({ value, label: PLAN_KIND_COPY[value].label }));

export const PLAN_VISIBILITY_OPTIONS: Array<{ value: PlanVisibility; label: string }> = (
  Object.keys(VISIBILITY_COPY.label) as PlanVisibility[]
).map((value) => ({ value, label: VISIBILITY_COPY.label[value] }));

/**
 * The status copy for a plan, falling back to the name the back sends when
 * the catalog has a key this front doesn't know yet.
 */
export function planStatusCopy(status: AdminPlan["status"]): Copy {
  return (PLAN_STATUS_COPY as Partial<Record<string, Copy>>)[status.key] ?? {
    label: status.name || status.key,
    description: "",
  };
}

/** The origin copy, or `null` when the back didn't send a known `kind`. */
export function planKindCopy(kind: AdminPlan["kind"]): Copy | null {
  return kind ? (PLAN_KIND_COPY as Partial<Record<string, Copy>>)[kind] ?? null : null;
}

/** The visibility label, or `null` when the back didn't send a known one. */
export function planVisibilityLabel(visibility: AdminPlan["visibility"]): string | null {
  return visibility ? (VISIBILITY_COPY.label as Partial<Record<string, string>>)[visibility] ?? null : null;
}

/** Why Explorar hides a plan; `null` reason means it's listed. */
export type ExploreHiddenCause = "generated" | "outing" | "private" | "cancelled";

export const EXPLORE_HIDDEN_REASON: Record<ExploreHiddenCause, string> = {
  generated: "Los resultados generados no se publican.",
  outing: "Las salidas son personales.",
  private: "Su autor no lo publicó.",
  cancelled: "Los planes cancelados no se muestran.",
};

/**
 * Whether Explorar > Planes lists a plan with this origin, visibility and
 * status: `null` when it does, the cause when it doesn't, or `undefined`
 * when the back didn't send `kind`/`visibility` and we can't tell.
 */
export function exploreHiddenCause(
  kind: AdminPlan["kind"],
  visibility: AdminPlan["visibility"],
  statusKey: string,
): ExploreHiddenCause | null | undefined {
  if (!kind || !visibility) return undefined;
  if (kind === "generated") return "generated";
  if (kind === "outing") return "outing";
  if (visibility === "private") return "private";
  if (statusKey === "cancelled") return "cancelled";
  return null;
}
