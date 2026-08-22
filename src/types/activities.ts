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
 * Query params accepted by `GET /activities` (CU9's search box only sends
 * `search`, `page`, and `limit`; the rest belong to CU10's filters and
 * CU11's sorting).
 */
export interface ActivitySearchParams extends ExplorationQueryParams {
  type?: string;
  sortBy?: ActivitySortField;
}
