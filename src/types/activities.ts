import { BaseEntity } from './common';
import type { ExplorationQueryParams } from './common';
import type { Place } from './places';
import type { Category } from './categories';

/**
 * A specific catalog experience (CU9-CU11, CU14, CU50, CU53).
 */
export interface Activity extends BaseEntity {
  name: string;
  description: string;
  estimatedCost: number;
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
  id: number;
  name: string;
  description: string;
  estimatedCost: number;
  estimatedDuration: number;
  type: string | null;
  averageRating: number;
  ratingCount: number;
  distanceKm: number | null;
  categories: ActivityCategorySummary[];
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
}

/**
 * One meeting point of an activity, as embedded in `ActivityDetailResult`
 * (CU14). Matches `ActivityLocationDto` in `SmartPlan-back` — a slimmer,
 * response-shaped projection of the full geographic hierarchy in
 * `src/types/places.ts`, not those entities themselves.
 */
export interface ActivityLocationSummary {
  id: number;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  place: {
    id: number;
    name: string;
    description: string | null;
    address: string;
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
  locations: ActivityLocationSummary[];
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
  estimatedCost: number;
  type: string | null;
  averageRating: number;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  categories: ActivityCategorySummary[];
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
