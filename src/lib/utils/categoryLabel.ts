/**
 * Spanish labels for the category names seeded by SmartPlan-back. The
 * backend keeps English catalog keys (`Gastronomy`, `Short trips`, ...);
 * these are display-only, so IDs and API values stay untouched.
 */
export const SEEDED_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  Gastronomy: "Gastronomía",
  Outdoors: "Aire libre",
  Culture: "Cultura",
  Entertainment: "Entretenimiento",
  Nightlife: "Vida nocturna",
  Sports: "Deportes",
  "Live music": "Música en vivo",
  Wellness: "Bienestar",
  Shopping: "Compras",
  "Short trips": "Escapadas",
};

// Lookup is case- and whitespace-insensitive because the same keys also
// show up as free-text activity types (`culture`, `gastronomy`).
const LABEL_BY_NORMALIZED_KEY = new Map(
  Object.entries(SEEDED_CATEGORY_LABELS).map(([key, label]) => [normalize(key), label]),
);

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

/**
 * Returns the Spanish label for a category name or activity type. Names
 * without a known translation (already in Spanish, or created later from
 * the admin panel) are returned as they are.
 */
export function categoryLabel(name: string): string {
  return LABEL_BY_NORMALIZED_KEY.get(normalize(name)) ?? name;
}
