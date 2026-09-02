import { BaseEntity, CatalogEntity } from './common';
import type { ExplorationQueryParams, SortDirection } from './common';
import type { User } from './users';
import type { FeedbackState, PlanFeedback, PlanRequest } from './recommendation';
import type { Activity, ActivityCategorySummary, ActivityLocationSummary } from './activities';

/**
 * Plan made up of activities (CU12, CU13, CU17, CU24-CU31, CU60).
 */
export interface Plan extends BaseEntity {
  title: string;
  description: string | null;
  idUser: number;
  idPlanRequest: number | null;
  idPlanStatus: number;
  estimatedTotalCost: number;
  estimatedTotalDuration: number;
  user?: User;
  request?: PlanRequest | null;
  status?: PlanStatus;
  details?: PlanDetail[];
}

/**
 * Individual item in a plan (CU13, CU27-CU30).
 */
export interface PlanDetail extends BaseEntity {
  idPlan: number;
  idActivity: number;
  order: number;
  estimatedCost: number;
  estimatedDuration: number;
  note: string | null;
  plan?: Plan;
  activity?: Activity;
}

/**
 * Expected keys for a plan's status (CU22, CU26, CU60).
 * Values match exactly what's seeded in SmartPlan-back
 * (`src/database/seeds/definitions.ts`).
 */
export type PlanStatusKey =
  | 'generated'
  | 'selected'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

/**
 * Status of a plan (CU22, CU26, CU60).
 */
export interface PlanStatus extends CatalogEntity<PlanStatusKey> {
  key: PlanStatusKey;
}

/**
 * Card-friendly projection of a plan returned by `GET /plans` (CU12).
 * Matches `PlanSummaryDto` in `SmartPlan-back`. A public exploration
 * projection: no owner, request criteria, or other sensitive fields.
 */
export interface PlanSearchResult {
  id: number;
  title: string;
  description: string | null;
  estimatedTotalCost: number;
  estimatedTotalDuration: number;
  activityCount: number;
  averageRating: number;
  distanceKm: number | null;
  categories: ActivityCategorySummary[];
  /** Activity names in itinerary order, e.g. `["Bodega", "Almuerzo"]`. */
  activityNames: string[];
  status: { key: PlanStatusKey; name: string };
  viewerPlanState?: ViewerPlanState;
}

/** Activity as embedded in a plan's itinerary (CU13). */
export interface PlanItineraryActivity {
  id: number;
  name: string;
  description: string;
  estimatedCost: number;
  estimatedDuration: number;
  type: string | null;
  averageRating: number;
  ratingCount: number;
  categories: ActivityCategorySummary[];
  locations: ActivityLocationSummary[];
}

/** One ordered stop in a plan's itinerary (CU13). */
export interface PlanItineraryItem {
  id: number;
  order: number;
  estimatedCost: number;
  estimatedDuration: number;
  activity: PlanItineraryActivity;
}

/**
 * What a plan means for the current viewer (CU22, PAN 17). Computed
 * server-side; the frontend never infers it. Any authenticated viewer of a
 * non-`cancelled` plan is `selectable` (or `selected` once they hold an
 * intention) — ownership and visibility don't matter. An anonymous viewer is
 * always `view-only`.
 * Matches `ViewerPlanState` in `SmartPlan-back` (`src/plans/plan-selectability.ts`).
 */
export type ViewerPlanState = 'selectable' | 'selected' | 'view-only';

/**
 * Plan detail returned by `GET /plans/:id` (CU13): the search summary plus
 * its ordered itinerary.
 */
export interface PlanDetailResult extends PlanSearchResult {
  details: PlanItineraryItem[];
  /** Selection affordance for the caller (CU22). */
  viewerPlanState: ViewerPlanState;
}

/**
 * Result of `PATCH /plans/:id/select` (CU22). The plan always belongs to a
 * request on success, so `planRequestId` is never null.
 * Matches `PlanSelectionResponseDto` in `SmartPlan-back`.
 */
export interface PlanSelectionResult {
  id: number;
  planRequestId: number | null;
  status: { key: PlanStatusKey; name: string };
  viewerPlanState?: ViewerPlanState;
}

/* ── CU23 · Plan history (PAN 13) ────────────────────────────────── */

/**
 * A plan in the signed-in user's own history, from `GET /users/me/plans`
 * (list) and `GET /users/me/plans/:id` (detail). Matches `OwnPlanSummaryDto`
 * in `SmartPlan-back`. Carries the CU23 feedback layer that the public
 * projections never expose.
 */
export interface OwnPlanSummary {
  id: number;
  title: string;
  description: string | null;
  estimatedTotalCost: number;
  estimatedTotalDuration: number;
  peopleCount: number;
  estimatedCostPerPerson: number;
  activityCount: number;
  status: { key: PlanStatusKey; name: string };
  /** ISO date the plan was marked `completed`, or `null`. */
  completedAt: string | null;
  feedbackState: FeedbackState;
  feedback: PlanFeedback | null;
  createdAt: string;
  updatedAt: string;
}

/** Own plan plus its ordered itinerary — `GET /users/me/plans/:id`. */
export interface OwnPlanDetail extends OwnPlanSummary {
  details: {
    id: number;
    order: number;
    estimatedCost: number;
    estimatedDuration: number;
    activity: {
      id: number;
      name: string;
      description: string;
      estimatedCost: number;
      estimatedDuration: number;
      type: string | null;
    };
  }[];
}

/** Query params accepted by `GET /users/me/plans` (CU23). */
export interface MyPlansParams {
  page?: number;
  limit?: number;
  direction?: SortDirection;
}

/** Sortable fields accepted by `GET /plans`. */
export type PlanSortField = 'relevance' | 'price' | 'rating' | 'distance';

/**
 * Query params accepted by `GET /plans` (CU12's search box only sends
 * `search`, `page`, and `limit`; the rest are the same filter/sort shape
 * as activities, except `type` is replaced by `outingType`).
 */
export interface PlanSearchParams extends ExplorationQueryParams {
  outingType?: string;
  sortBy?: PlanSortField;
}

/** Query params accepted by `GET /users/me/plans` (CU29). */
export interface ListOwnPlansParams {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt';
  direction?: SortDirection;
}

export interface CreatePlanDto {
  title: string;
  description?: string | null;
  peopleCount: number;
}

export interface UpdatePlanDto {
  title?: string;
  description?: string | null;
  peopleCount?: number;
}

export interface AddPlanDetailDto {
  activityId: number;
}

export interface OwnPlanCostSummary {
  estimatedTotalCost: number;
  peopleCount: number;
  estimatedCostPerPerson: number;
  estimatedTotalDuration: number;
}

export interface OwnPlanDetailItem {
  id: number;
  order: number;
  estimatedCost: number;
  estimatedDuration: number;
  activity: {
    id: number;
    name: string;
    description: string;
    estimatedCost: number;
    estimatedDuration: number;
    type: string | null;
  };
}

/**
 * Payload for requesting a suggested plan (CU31).
 * Backend contract: `POST /api/plan-suggestions`.
 */
export interface PlanSuggestionDto {
  budget: number;
  latitude: number;
  longitude: number;
  peopleCount: number;
  availableDurationMinutes: number;
  preferences?: string[];
  notes?: string;
}
