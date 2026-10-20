import type { IconName } from "@/components/ui";

/**
 * Display side of SmartPlan's controlled vocabularies (mirrors
 * `src/catalog/taxonomy.ts` in SmartPlan-back, which owns the keys, labels
 * and search aliases). The backend sends Spanish labels (`kindLabel`,
 * `typeLabel`); this file only adds what a screen needs on top: an icon and
 * the artwork family used when there is no real photo.
 */

export type ArtworkFamily =
  | "wine"
  | "food"
  | "night"
  | "culture"
  | "outdoors"
  | "adventure"
  | "wellness"
  | "shopping"
  | "sports"
  | "other";

interface Presentation {
  icon: IconName;
  family: ArtworkFamily;
}

/** Stable subtype keys used by the Explore API's `type` filter. */
export const ACTIVITY_TYPE_OPTIONS = [
  { value: "", label: "Cualquier actividad" },
  { value: "self_guided_visit", label: "Visita por cuenta propia" },
  { value: "tasting", label: "Degustación" },
  { value: "winery_tour", label: "Visita a bodega" },
  { value: "winery_meal", label: "Almuerzo en bodega" },
  { value: "meal", label: "Almuerzo o cena" },
  { value: "coffee", label: "Café y merienda" },
  { value: "craft_beer", label: "Cerveza artesanal" },
  { value: "drinks", label: "Tragos" },
  { value: "dancing", label: "Salir a bailar" },
  { value: "museum_visit", label: "Visita a museo" },
  { value: "guided_tour", label: "Visita guiada" },
  { value: "heritage_visit", label: "Sitio histórico" },
  { value: "live_show", label: "Espectáculo" },
  { value: "walk", label: "Paseo" },
  { value: "viewpoint_visit", label: "Mirador" },
  { value: "day_trip", label: "Excursión" },
  { value: "trekking", label: "Trekking" },
  { value: "rafting", label: "Rafting" },
  { value: "horseback_riding", label: "Cabalgata" },
  { value: "canopy", label: "Canopy" },
  { value: "kayak", label: "Kayak" },
  { value: "thermal_baths", label: "Termas" },
  { value: "spa_treatment", label: "Spa" },
  { value: "ski", label: "Esquí" },
];

const PLACE_KINDS: Record<string, Presentation> = {
  winery: { icon: "wine", family: "wine" },
  restaurant: { icon: "utensils", family: "food" },
  cafe: { icon: "coffee", family: "food" },
  bakery: { icon: "coffee", family: "food" },
  ice_cream: { icon: "ice-cream-cone", family: "food" },
  bar: { icon: "martini", family: "night" },
  brewery: { icon: "beer", family: "night" },
  nightclub: { icon: "music-2", family: "night" },
  distillery: { icon: "martini", family: "food" },
  olive_mill: { icon: "utensils", family: "food" },
  market: { icon: "store", family: "shopping" },
  shopping_center: { icon: "shopping-bag", family: "shopping" },
  museum: { icon: "landmark", family: "culture" },
  theatre: { icon: "drama", family: "culture" },
  cultural_center: { icon: "palette", family: "culture" },
  heritage: { icon: "landmark", family: "culture" },
  memorial: { icon: "landmark", family: "culture" },
  park: { icon: "trees", family: "outdoors" },
  plaza: { icon: "trees", family: "outdoors" },
  viewpoint: { icon: "sunset", family: "outdoors" },
  mountain: { icon: "mountain", family: "outdoors" },
  nature_reserve: { icon: "mountain", family: "outdoors" },
  natural_monument: { icon: "mountain", family: "outdoors" },
  reservoir: { icon: "waves", family: "outdoors" },
  canyon: { icon: "mountain", family: "outdoors" },
  hot_springs: { icon: "waves", family: "wellness" },
  spa: { icon: "flower-2", family: "wellness" },
  ski_resort: { icon: "mountain", family: "sports" },
  adventure_operator: { icon: "tent", family: "adventure" },
  sports_venue: { icon: "dumbbell", family: "sports" },
  stadium: { icon: "trophy", family: "sports" },
  amusement: { icon: "popcorn", family: "other" },
  cinema: { icon: "popcorn", family: "other" },
  zoo: { icon: "trees", family: "outdoors" },
  live_music_venue: { icon: "music-2", family: "night" },
  visitor_center: { icon: "info", family: "culture" },
};

const ACTIVITY_SUBTYPES: Record<string, Presentation> = {
  tasting: { icon: "wine", family: "wine" },
  winery_tour: { icon: "wine", family: "wine" },
  winery_meal: { icon: "wine", family: "wine" },
  meal: { icon: "utensils", family: "food" },
  coffee: { icon: "coffee", family: "food" },
  drinks: { icon: "martini", family: "night" },
  craft_beer: { icon: "beer", family: "night" },
  dancing: { icon: "music-2", family: "night" },
  live_show: { icon: "drama", family: "culture" },
  live_music: { icon: "music-2", family: "night" },
  museum_visit: { icon: "landmark", family: "culture" },
  guided_tour: { icon: "landmark", family: "culture" },
  heritage_visit: { icon: "landmark", family: "culture" },
  walk: { icon: "trees", family: "outdoors" },
  self_guided_visit: { icon: "map-pin", family: "other" },
  viewpoint_visit: { icon: "sunset", family: "outdoors" },
  day_trip: { icon: "luggage", family: "outdoors" },
  trekking: { icon: "mountain", family: "adventure" },
  rafting: { icon: "waves", family: "adventure" },
  horseback_riding: { icon: "mountain", family: "adventure" },
  canopy: { icon: "tent", family: "adventure" },
  kayak: { icon: "waves", family: "adventure" },
  climbing: { icon: "mountain", family: "adventure" },
  paragliding: { icon: "sun", family: "adventure" },
  mountain_bike: { icon: "bike", family: "adventure" },
  ski: { icon: "mountain", family: "sports" },
  thermal_baths: { icon: "waves", family: "wellness" },
  spa_treatment: { icon: "flower-2", family: "wellness" },
  workshop: { icon: "palette", family: "culture" },
  shopping: { icon: "shopping-bag", family: "shopping" },
  sport_activity: { icon: "dumbbell", family: "sports" },
  amusement: { icon: "popcorn", family: "other" },
};

const FALLBACK: Presentation = { icon: "map-pin", family: "other" };

export function placeKindPresentation(kind: string | null | undefined): Presentation {
  return (kind && PLACE_KINDS[kind]) || FALLBACK;
}

export function activitySubtypePresentation(
  subtype: string | null | undefined,
): Presentation {
  return (subtype && ACTIVITY_SUBTYPES[subtype]) || FALLBACK;
}

/**
 * Warm, family-specific artwork for an item without a real photo: a designed
 * SmartPlan fallback, never a grey "no image" box.
 */
export const ARTWORK_GRADIENTS: Record<ArtworkFamily, string> = {
  wine: "linear-gradient(135deg, #5b1a2b 0%, #8e2f45 55%, #c86b5a 100%)",
  food: "linear-gradient(135deg, #8a3b12 0%, #c4622d 55%, #e9a65b 100%)",
  night: "linear-gradient(135deg, #1f1b3a 0%, #3d2f6b 55%, #7c4f8f 100%)",
  culture: "linear-gradient(135deg, #2f3b4c 0%, #5a6b80 55%, #b49a6a 100%)",
  outdoors: "linear-gradient(135deg, #2f4a2b 0%, #4f7a3f 55%, #a7b86a 100%)",
  adventure: "linear-gradient(135deg, #3b2a1a 0%, #7a5230 55%, #c9934f 100%)",
  wellness: "linear-gradient(135deg, #24504f 0%, #3f8077 55%, #9cc5b4 100%)",
  shopping: "linear-gradient(135deg, #5a3a1a 0%, #a0663a 55%, #e0b07a 100%)",
  sports: "linear-gradient(135deg, #1f3550 0%, #3b6a94 55%, #8db3d1 100%)",
  other: "linear-gradient(135deg, #4a3a2f 0%, #7a6152 55%, #c4a58c 100%)",
};

/** Months as "jun–sep" for a seasonal activity. */
export function seasonLabel(months: number[] | null | undefined): string | null {
  if (!months || months.length === 0 || months.length === 12) return null;
  const names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const sorted = [...months].sort((a, b) => a - b);
  return `${names[sorted[0] - 1]}–${names[sorted[sorted.length - 1] - 1]}`;
}
