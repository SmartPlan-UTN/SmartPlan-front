/**
 * Limits for the plan composer. People are capped at 20 in this flow, while
 * the backend DTO permits up to 1000 for existing plans and other clients.
 * There is deliberately no maximum number of stops: the backend has none.
 */
export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 2000;
export const PEOPLE_MIN = 1;
export const PEOPLE_MAX = 20;
/** `GET /activity-suggestions` rejects more excluded ids than this. */
export const SUGGESTION_EXCLUDE_MAX = 100;

export interface IdeaErrors {
  title: string | null;
  people: string | null;
}

/** Why a title cannot be saved, or null. Whitespace-only counts as empty. */
export function validateTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Escribí un nombre para el plan.";
  if (trimmed.length > TITLE_MAX) {
    return `El nombre admite hasta ${TITLE_MAX} caracteres.`;
  }
  return null;
}

/** Why a description cannot be saved, or null. It is optional. */
export function validateDescription(description: string): string | null {
  return description.trim().length > DESCRIPTION_MAX
    ? `La nota admite hasta ${DESCRIPTION_MAX.toLocaleString("es-AR")} caracteres.`
    : null;
}

/** People must be a whole number in range; NaN (an empty field) is invalid. */
export function validatePeople(people: number): string | null {
  return Number.isInteger(people) &&
    people >= PEOPLE_MIN &&
    people <= PEOPLE_MAX
    ? null
    : `La cantidad de personas debe estar entre ${PEOPLE_MIN} y ${PEOPLE_MAX.toLocaleString("es-AR")}.`;
}

/** Why a price range cannot be searched, or null. */
export function validatePriceRange(
  min: number | undefined,
  max: number | undefined,
): string | null {
  return min !== undefined && max !== undefined && min > max
    ? "El precio mínimo no puede superar al máximo."
    : null;
}
