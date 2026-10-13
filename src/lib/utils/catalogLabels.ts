/**
 * How catalog categories and activity types read in the Spanish interface.
 *
 * The catalog stores English identifiers ("Gastronomy", "Live music") and they
 * stay that way: they are data, the API filters on them and other systems
 * share them. This is presentation only, in one place, so a screen never
 * prints a raw identifier. A name that is not listed (a category an admin adds
 * later) is shown as it is rather than hidden or guessed.
 */
const LABELS: Record<string, string> = {
  culture: "Cultura",
  entertainment: "Entretenimiento",
  gastronomy: "Gastronomía",
  "live music": "Música en vivo",
  nightlife: "Vida nocturna",
  outdoors: "Aire libre",
  outdoor: "Aire libre",
  shopping: "Compras",
  "short trips": "Escapadas",
  sports: "Deportes",
  wellness: "Bienestar",
};

/** The Spanish label of a category name or activity type; unknown names pass through. */
export function categoryLabel(name: string): string {
  return LABELS[name.trim().toLowerCase()] ?? name;
}

const IDENTIFIERS = Object.keys(LABELS).sort((a, b) => b.length - a.length);
const IDENTIFIER_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(${IDENTIFIERS.map((key) => key.replace(/ /g, "\\s+")).join("|")})(?![\\p{L}\\p{N}])`,
  "giu",
);

/**
 * Free text (a reason or a note written by the assistant) with any raw
 * category identifier replaced by its Spanish label, for when the model
 * echoes a catalog name it was given.
 */
export function localizeCatalogText(text: string): string {
  return text.replace(IDENTIFIER_PATTERN, (match) => categoryLabel(match));
}
