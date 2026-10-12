import type { AdminActivity } from "@/types";

/** Plain-language reasons for the catalog eligibility codes the API returns. */
const REASON_LABELS: Record<string, string> = {
  not_published: "No está publicada",
  no_name: "Falta el nombre",
  no_description: "Falta la descripción",
  description_too_short:
    "La descripción es muy corta para recomendarla automáticamente",
  no_duration: "Falta la duración",
  price_unknown: "No tiene un precio confirmado",
  price_confidence_low: "El precio es una estimación sin verificar",
  price_stale: "El precio no se verifica hace más de 90 días",
  no_active_category: "No tiene una categoría activa",
  no_coordinates: "No tiene una ubicación con coordenadas",
};

export function reasonLabel(code: string): string {
  return REASON_LABELS[code] ?? code;
}

export interface EligibilityBadge {
  key: string;
  label: string;
  /** Why, for a tooltip or a help line. */
  detail: string;
}

/**
 * What an administrator should know about where an activity can appear.
 * Nothing is returned for an activity that is fully eligible.
 */
export function eligibilityBadges(activity: AdminActivity): EligibilityBadge[] {
  const eligibility = activity.eligibility;
  if (!eligibility) return [];

  const detail = eligibility.reasons.map(reasonLabel).join(". ");
  const badges: EligibilityBadge[] = [];

  if (eligibility.status !== "published") {
    badges.push({
      key: "status",
      label:
        eligibility.status === "archived"
          ? "Archivada"
          : eligibility.status === "draft"
            ? "Borrador"
            : "En revisión",
      detail: "No se muestra al público.",
    });
  } else if (!eligibility.discoverable) {
    badges.push({ key: "hidden", label: "No visible", detail });
  } else if (!eligibility.planEligible) {
    badges.push({ key: "plan", label: "No se puede agregar a planes", detail });
  } else if (!eligibility.autoRecommendEligible) {
    badges.push({ key: "auto", label: "No se recomienda sola", detail });
  }
  return badges;
}
