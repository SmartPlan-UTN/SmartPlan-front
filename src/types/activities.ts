import type { Price } from './pricing';
import { BaseEntity } from './common';
import type { ExplorationQueryParams } from './common';
import type { Place } from './places';
import type { Category } from './categories';
import type { PlaceSummary } from './explore';

/**
 * A specific catalog experience (CU9-CU11, CU14, CU50, CU53).
 */
export interface Activity extends BaseEntity {
  name: string;
  description: string;
  estimatedCost: number | null;
  price?: Price | null;
  estimatedDuration: number;
  categories?: ActivityCategory[];
  places?: ActivityPlace[];
}
/**
 * Location of an activity (CU14, CU16, CU50). N:M relationship between Activity and Place.
 */
export interface ActivityPlace extends BaseEntity {
  idActivity: number;
  idPlace: number;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  activity?: Activity;
  place?: Place;
}

/**
 * Category of an activity (CU10, CU53). N:M relationship between Activity and Category.
 */
export interface ActivityCategory extends BaseEntity {
  idActivity: number;
  idCategory: number;
  activity?: Activity;
  category?: Category;
}

/**
 * Category as embedded in a search result card: just enough to render a
 * `Badge`, without the full `Category` catalog entity.
 */
export interface ActivityCategorySummary {
  id: number;
  name: string;
}

/**
 * Card-friendly projection of an activity returned by `GET /activities`
 * (CU9-CU11). Matches `ActivitySummaryDto` in `SmartPlan-back`.
 */
export interface ActivitySearchResult {
  costBasis?: 'per_party' | 'per_person';
  id: number;
  imageUrl?: string | null;
  /** `google_maps` when `imageUrl` is a Google Places photo (SmartPlan-back#102). */
  imageSource?: import('./media').ImageSource | null;
  name: string;
  description: string;
  estimatedCost: number | null;
  price?: Price | null;
  estimatedDuration: number;
  /** `ActivitySubtype` key (what the person does). */
  type: string | null;
  /** Spanish label of `type`. */
  typeLabel?: string | null;
  /** Months (1-12) a seasonal activity runs in; null = all year. */
  availableMonths?: number[] | null;
  inSeason?: boolean;
  /** SmartPlan's own average; null when nobody rated it (never 0). */
  averageRating: number | null;
  ratingCount: number;
  distanceKm: number | null;
  categories: ActivityCategorySummary[];
  /** The place the card refers to, with live attributed Google context. */
  place?: PlaceSummary | null;
}

/**
 * Sortable fields accepted by `GET /activities`. `relevance` is the default
 * and requires no `sortBy` value.
 */
export type ActivitySortField = 'relevance' | 'price' | 'rating' | 'distance';

/**
 * Query params accepted by `GET /activities`: `search` drives CU9, the
 * rest of `ExplorationQueryParams` (`categoryIds`, `minPrice`/`maxPrice`,
 * `minRating`, `maxDistanceKm`, ...) drives CU10, and `sortBy`/`direction`
 * drive CU11.
 */
export interface ActivitySearchParams extends ExplorationQueryParams {
  type?: string;
  sortBy?: ActivitySortField;
  /** "Provincia" filter: only activities with a meeting point in this city. */
  cityId?: number;
  /** "Localidad" filter: only activities with a meeting point in this
   * department. Sent alongside `cityId` once a department is chosen. */
  departmentId?: number;
  /** Occasions (`Occasion` keys): activities that suit any of them. */
  occasions?: string[];
  /** Only games and plans at home (the Hogar). */
  atHome?: boolean;
  /** Only evidenced free prices; an unknown price never counts as free. */
  free?: boolean;
}

/**
 * One meeting point of an activity, as embedded in `ActivityDetailResult`
 * (CU14). Matches `ActivityLocationDto` in `SmartPlan-back` — a slimmer,
 * response-shaped projection of the full geographic hierarchy in
 * `src/types/places.ts`, not those entities themselves.
 */
export interface ActivityLocationSummary {
  id: number;
  /** This place's Google Places photo; `null` when it is not linked to Google. */
  photoUrl?: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  /** Google Place ID (identity link): lets the UI request a live photo. */
  googlePlaceId?: string | null;
  /** Temporary Google rating of the place: attribute it to Google Maps. */
  externalRating?: {
    rating: number;
    ratingCount: number;
    source: "google";
  } | null;
  /** Temporary place-level Google price reference (not the activity price). */
  externalPrice?: {
    min: number | null;
    max: number | null;
    currency: string | null;
    level: string | null;
    source: "google";
  } | null;
  place: {
    id: number;
    name: string;
    description: string | null;
    address: string;
    kind?: string | null;
    department: {
      id: number;
      name: string;
      city: {
        id: number;
        name: string;
        country: { id: number; name: string };
      };
    };
  };
}

/**
 * Activity detail returned by `GET /activities/:id` (CU14): the search
 * summary plus every meeting point.
 */
export interface ActivityDetailResult extends ActivitySearchResult {
  costBasis?: 'per_party' | 'per_person';
  availableTimesOfDay?: import('./recommendation').TimeOfDay[];
  minPeople?: number | null;
  maxPeople?: number | null;
  images?: import('./media').MediaImage[];
  locations: ActivityLocationSummary[];
  /** False when it cannot be added to a plan (e.g. no exact location). */
  planEligible?: boolean;
}

/**
 * One marker returned by `GET /activities/map` (CU16). Represents an
 * `activity_place`, not an activity: one activity with two meeting points
 * produces two markers.
 */
export interface ActivityMapMarker {
  id: number;
  activityId: number;
  placeId: number;
  name: string;
  placeName: string;
  address: string;
  estimatedCost: number | null;
  price?: Price | null;
  type: string | null;
  typeLabel?: string | null;
  /** SmartPlan's own average; null when nobody rated it (never 0). */
  averageRating: number | null;
  ratingCount?: number;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  categories: ActivityCategorySummary[];
  place?: PlaceSummary | null;
}

/**
 * Query params accepted by `GET /activities/map`: the same filters as
 * `ActivitySearchParams`, plus the viewport bounds.
 */
export interface MapActivitiesParams extends ActivitySearchParams {
  south: number;
  north: number;
  west: number;
  east: number;
}
