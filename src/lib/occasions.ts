import type { Occasion, OccasionGroup } from "@/types";

/**
 * How occasions read in the Spanish interface (SmartPlan-back
 * `src/catalog/taxonomy.ts`). Presentation only; the API keeps the keys.
 */
export const OCCASIONS: ReadonlyArray<{
  key: Occasion;
  label: string;
  short: string;
  group: OccasionGroup;
}> = [
  { key: "romantic", label: "Romántico / en pareja", short: "En pareja", group: "who" },
  { key: "friends", label: "Con amigos", short: "Con amigos", group: "who" },
  { key: "family", label: "En familia", short: "En familia", group: "who" },
  { key: "kids", label: "Con niños", short: "Con niños", group: "who" },
  { key: "solo", label: "Solo", short: "Solo", group: "who" },
  { key: "big_group", label: "Grupo grande", short: "Grupo grande", group: "who" },
  { key: "quiet", label: "Tranquilo", short: "Tranquilo", group: "mood" },
  { key: "party", label: "Fiesta", short: "Fiesta", group: "mood" },
  { key: "outdoor", label: "Al aire libre", short: "Aire libre", group: "mood" },
  { key: "indoor", label: "Bajo techo / día de lluvia", short: "Bajo techo", group: "mood" },
  { key: "adventure", label: "Aventura", short: "Aventura", group: "mood" },
  { key: "special", label: "Especial / para celebrar", short: "Especial", group: "mood" },
];

const BY_KEY = new Map(OCCASIONS.map((occasion) => [occasion.key as string, occasion]));

export const OCCASION_GROUP_LABELS: Record<OccasionGroup, string> = {
  who: "Quién va",
  mood: "Ambiente",
};

/** The short Spanish label of an occasion key; unknown keys are hidden. */
export function occasionLabel(key: string): string | null {
  return BY_KEY.get(key)?.short ?? null;
}

/** Known occasions of a list, in vocabulary order ("who" first). */
export function sortOccasions(keys: readonly string[]): Occasion[] {
  return OCCASIONS.filter((occasion) => keys.includes(occasion.key)).map(
    (occasion) => occasion.key,
  );
}
