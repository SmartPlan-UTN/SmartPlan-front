import { BaseEntity, CatalogEntity } from "./common";
import type { ExplorationQueryParams, SortDirection } from "./common";
import type { User } from "./users";
import type {
  FeedbackState,
  PlanFeedback,
  PlanRequest,
} from "./recommendation";
import type {
  Activity,
  ActivityCategorySummary,
  ActivityLocationSummary,
  ActivitySearchResult,
} from "./activities";

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
  | "generated"
  | "selected"
  | "confirmed"
  | "completed"
  | "cancelled";

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
  imageUrl?: string | null;
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
  /**
   * The viewer's outing still to do that was copied from this plan (CU22), so
   * "Lo voy a hacer" becomes "Ver en Mis salidas"; `null` otherwise.
   */
  activeOutingId?: number | null;
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
 * server-side; the frontend never infers it:
 *  - `selectable`: the viewer may choose it ("Lo voy a hacer");
 *  - `selected`: the viewer already has an outing to do from it;
 *  - `view-only`: anonymous, cancelled, an outing, or not choosable.
 * Matches `ViewerPlanState` in `SmartPlan-back` (`src/plans/plan-selectability.ts`).
 */
export type ViewerPlanState = "selectable" | "selected" | "view-only";

/**
 * What a plan row is (SmartPlan-back#98):
 *  - `authored`: created by a person; lives in "Mis planes" and can be published;
 *  - `generated`: one alternative of a "Planificar" request, private to it;
 *  - `outing`: a person's frozen copy of a plan they chose ("Mis salidas").
 */
export type PlanKind = 'authored' | 'generated' | 'outing';

/** Only an author publishes a plan; everything starts `private`. */
export type PlanVisibility = 'private' | 'public';

/**
 * Plan detail returned by `GET /plans/:id` (CU13): the search summary plus
 * its ordered itinerary.
 */
export interface PlanDetailResult extends PlanSearchResult {
  images?: import('./media').MediaImage[];
  details: PlanItineraryItem[];
  /** Selection affordance for the caller (CU22). */
  viewerPlanState: ViewerPlanState;
  activeOutingId: number | null;
  kind: PlanKind;
  visibility: PlanVisibility;
  /** The caller owns this plan, result, or outing. */
  ownedByViewer: boolean;
}

/* ── Mis planes (CU24-CU30) ─────────────────────────────────────── */

/**
 * A plan the signed-in user authored, from `GET /users/me/plans` (list) and
 * `GET /users/me/plans/:id` (detail). Matches `OwnPlanSummaryDto` in
 * `SmartPlan-back`. Generated results and outings are never listed here.
 */
export interface OwnPlanSummary {
  id: number;
  title: string;
  description: string | null;
  visibility: PlanVisibility;
  estimatedTotalCost: number;
  estimatedTotalDuration: number;
  peopleCount: number;
  estimatedCostPerPerson: number;
  activityCount: number;
  status: { key: PlanStatusKey; name: string };
  createdAt: string;
  updatedAt: string;
}

/* ── Mis salidas (CU22, CU23) ───────────────────────────────────── */

/** `to_do` until the person marks it done, then `completed`. */
export type OutingStatus = 'to_do' | 'completed';

/**
 * The plan an outing was copied from. `available` is `false` once its author
 * made it private or cancelled it; the outing itself never changes.
 */
export interface OutingSource {
  id: number;
  kind: PlanKind;
  title: string;
  available: boolean;
}

/** One entry of "Mis salidas" — `GET /users/me/outings`. */
export interface OutingSummary {
  id: number;
  imageUrl?: string | null;
  title: string;
  description: string | null;
  estimatedTotalCost: number;
  estimatedTotalDuration: number;
  peopleCount: number;
  estimatedCostPerPerson: number;
  activityCount: number;
  activityNames: string[];
  status: OutingStatus;
  /** ISO date the outing was marked done, or `null` while to do. */
  completedAt: string | null;
  /** Opens as soon as the outing is done and never closes (CU23). */
  feedbackState: FeedbackState;
  feedback: PlanFeedback | null;
  source: OutingSource | null;
  createdAt: string;
}

/** `GET /users/me/outings/:id`: the frozen itinerary with its places. */
export interface OutingDetail extends OutingSummary {
  travelDistanceMeters: number | null;
  travelDurationSeconds: number | null;
  details: PlanItineraryItem[];
}

/**
 * Result of "Lo voy a hacer" (`POST /users/me/outings`) and "Volver a hacer
 * este plan" (`POST /users/me/outings/:id/repeat`). `created` is `false` when
 * an outing to do already existed and was returned instead of a duplicate.
 */
export interface OutingCreationResult {
  created: boolean;
  outing: OutingDetail;
}

/** Order of "Mis salidas"; `recent` is the default (#134). */
export type OutingSort = "recent" | "oldest" | "cost_desc" | "cost_asc";

/** What "Mis salidas" can be narrowed by (#134). Dates are `YYYY-MM-DD`. */
export interface OutingFilters {
  /** In the title or the name of any activity. */
  search?: string;
  from?: string;
  to?: string;
  sort?: OutingSort;
  /** Only done outings with (`true`) or without (`false`) feedback. */
  rated?: boolean;
}

export interface ListOutingsParams extends OutingFilters {
  status?: OutingStatus;
  page?: number;
  limit?: number;
}

/** One catalog activity suggested for the plan being edited (#98). */
export interface ActivitySuggestion {
  id: number;
  name: string;
  description: string;
  estimatedCost: number;
  estimatedDuration: number;
  type: string | null;
  categories: string[];
}

/**
 * The composer's assistant (`/users/me/plans/assistant/*`). Gemini judges
 * meaning; every activity here is a real catalog row and every number
 * (distance, minutes, cost) was computed by the API. Nothing in these
 * answers changes a plan: the person accepts or ignores each proposal.
 */
export interface AssistantSearchResponse {
  interpretation: { chips: string[]; nearName: string | null };
  results: Array<{ activity: ActivitySearchResult; reason: string | null }>;
}

export interface AssistantSuggestResponse {
  suggestions: Array<{
    activity: ActivitySearchResult;
    reason: string | null;
  }>;
  /** A kind of activity the route lacks, when one clearly does. */
  gap: { categoryName: string; message: string } | null;
}

export interface AssistantProposalEffect {
  minutes: number;
  cost: number;
  /** Change in straight-line km; null when any position is unknown. */
  km: number | null;
}

export type AssistantProposal =
  | {
      kind: "reorder";
      reason: string;
      orderedActivityIds: number[];
      effect: AssistantProposalEffect;
    }
  | {
      kind: "add";
      reason: string;
      activity: ActivitySearchResult;
      /** Zero-based slot in the route; null appends. */
      position: number | null;
      effect: AssistantProposalEffect;
    }
  | {
      kind: "remove";
      reason: string;
      activityId: number;
      effect: AssistantProposalEffect;
    };

export interface AssistantImproveResponse {
  proposals: AssistantProposal[];
}

export interface ActivitySuggestionsParams {
  title: string;
  description?: string;
  excludeActivityIds?: number[];
}

/* ── In-app notifications ───────────────────────────────────────── */

/**
 * A personal in-app notification. `resourceType: 'outing'` is the 24 h
 * feedback reminder and `resourceId` the outing it opens (CU23).
 */
export interface AppNotification {
  id: number;
  title: string;
  message: string;
  resourceType: string | null;
  resourceId: number | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  data: AppNotification[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  unreadCount: number;
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
export type PlanSortField = "relevance" | "price" | "rating" | "distance";

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
  sortBy?: "createdAt";
  direction?: SortDirection;
}

export interface CreatePlanDto {
  title: string;
  description?: string | null;
  peopleCount: number;
}

export interface PlanComposerStopDto {
  activityId: number;
  /** Sent only for a stop retained from the plan being edited. */
  detailId?: number;
}

export interface CreatePlanComposerDto {
  requestId: string;
  title: string;
  description: string | null;
  peopleCount: number;
  visibility: PlanVisibility;
  stops: PlanComposerStopDto[];
}

export interface UpdatePlanComposerDto {
  requestId: string;
  title: string;
  description: string | null;
  peopleCount: number;
  visibility: PlanVisibility;
  stops: PlanComposerStopDto[];
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
