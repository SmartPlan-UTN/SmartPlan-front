import { BaseEntity, CatalogEntity } from './common';
import type { PaginationMetadata } from './common';
import type { ActivityCategorySummary } from './activities';
import type { PlanStatusKey } from './plans';

/**
 * Expected keys for a plan request's status (CU17, CU19).
 * Values match exactly what's seeded in SmartPlan-back
 * (`src/database/seeds/definitions.ts`, table `request_status`).
 */
export type RequestStatusKey = 'pending' | 'processing' | 'generated' | 'failed';

/** Time-of-day option accepted in a plan request's context (CU17, CU19). */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Optional generation context for a plan request (CU17). Every field is
 * genuinely optional: only fields the user actually set through a context
 * chip are included when submitting — never filled with a default.
 * Matches `PlanRequestContextDto` in `SmartPlan-back`.
 */
export interface PlanRequestContext {
  budget?: number;
  partySize?: number;
  timeOfDay?: TimeOfDay;
  availableDuration?: number;
}

/**
 * Body accepted by `POST /plan-requests` (CU17).
 * Matches `CreatePlanRequestDto` in `SmartPlan-back`.
 */
export interface CreatePlanRequestPayload {
  query: string;
  context?: PlanRequestContext;
}

/**
 * Body accepted by `POST /plan-requests/surprise` (CU19).
 * Matches `CreateSurprisePlanRequestDto` in `SmartPlan-back`.
 */
export interface CreateSurprisePlanRequestPayload {
  latitude: number;
  longitude: number;
}

/**
 * Response returned by both `POST /plan-requests` and
 * `POST /plan-requests/surprise` (HTTP 202). Matches
 * `PlanRequestAcceptedDto` in `SmartPlan-back`.
 */
export interface PlanRequestAccepted {
  id: number;
  statusKey: 'pending';
  mode: 'automatic' | 'surprise';
  requestedAt: string;
}

/**
 * Plan summary as embedded in a plan request's status once generated.
 * Matches `PlanSummaryDto` in `SmartPlan-back`'s recommendation module.
 */
export interface PlanRequestPlanSummary {
  id: number;
  title: string;
  description: string | null;
  estimatedTotalCost: number;
  estimatedTotalDuration: number;
  activityCount: number;
  averageRating: number;
  distanceKm: number | null;
  categories: ActivityCategorySummary[];
  /** Activity names in itinerary order (CU19 shows these on each option). */
  activityNames: string[];
  status: { key: PlanStatusKey; name: string };
  viewerPlanState?: import('./plans').ViewerPlanState;
}

/**
 * Response returned by `GET /plan-requests/:id` (CU17, CU19). `plans` is
 * only populated once `statusKey === 'generated'`; `failedAt`/`failureCode`/
 * `failureDetail` are only populated once `statusKey === 'failed'`. Matches
 * `PlanRequestStatusDto` in `SmartPlan-back`.
 */
export interface PlanRequestStatus {
  id: number;
  statusKey: RequestStatusKey;
  mode: string;
  requestedAt: string;
  plans?: PlanRequestPlanSummary[];
  failedAt?: string | null;
  failureCode?: string | null;
  failureDetail?: Record<string, unknown> | null;
}

/**
 * Domain entity backing a plan request, as embedded in `Plan.request`
 * (`src/types/plans.ts`). A thinner projection than `PlanRequestStatus`
 * above (that one is the `GET /plan-requests/:id` response shape) — this
 * is the raw entity relation, matching the `plan_request` table's own
 * columns for the fields the frontend actually consumes.
 */
export interface PlanRequest extends BaseEntity {
  idUser: number;
  mode: 'automatic' | 'surprise';
  rawQuery: string | null;
  budget: number | null;
  idDepartment: number | null;
  availableDuration: number | null;
  requestedAt: string;
  idRequestStatus: number;
  notes: string | null;
  status?: { key: RequestStatusKey; name: string };
}

/**
 * Predefined feedback reaction tags (CU23). Values match `FEEDBACK_TAGS` in
 * `SmartPlan-back` (`src/recommendation/entities/feedback.entity.ts`); the
 * Spanish labels shown to the user live in
 * `src/components/feedback/feedbackContent.ts`.
 */
export const FEEDBACK_TAGS = [
  'too_expensive',
  'great_value',
  'far',
  'would_recommend',
] as const;

export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];

/**
 * A plan's recorded post-experience feedback (CU23), as read back from the
 * owner plan list/detail. Matches `PlanFeedbackDto` in `SmartPlan-back`.
 * The estimated cost is never stored here — SmartPlan already knows it from
 * the plan; the user only reports `actualCost`.
 */
export interface PlanFeedback {
  rating: number;
  tags: FeedbackTag[];
  comment: string | null;
  actualCost: number | null;
  actualDuration: number | null;
  createdAt: string;
}

/**
 * Where a plan sits in the CU23 feedback lifecycle, derived server-side.
 * There is no `expired`: US18 defines no closing window. Matches
 * `FeedbackState` in `SmartPlan-back`.
 *
 *  - `not_available` → not `completed`, or completed < 24 h ago with no reminder.
 *  - `available`     → window open (reminder sent, or 24 h elapsed) and no feedback.
 *  - `submitted`     → feedback already recorded.
 */
export type FeedbackState = 'not_available' | 'available' | 'submitted';

/**
 * Body accepted by `POST /plans/:id/feedback` (CU23). Only `rating` is
 * required. Matches `CreateFeedbackDto` in `SmartPlan-back`.
 */
export interface CreateFeedbackPayload {
  rating: number;
  tags?: FeedbackTag[];
  comment?: string;
  actualCost?: number;
  actualDuration?: number;
}

/**
 * Expected keys for feedback status (CU21, CU23).
 * Values match exactly what's seeded in SmartPlan-back.
 */
export type FeedbackStatusKey = 'pending' | 'processed' | 'discarded';

/**
 * Processing status of a feedback entry (CU21, CU23).
 */
export interface FeedbackStatus extends CatalogEntity<FeedbackStatusKey> {
  key: FeedbackStatusKey;
}

/* ── CU20 · Show recommendations (US19, PAN 10) ──────────────────── */

/**
 * Why a plan was recommended — the dominant ranking signal (CU20 · CU21).
 * Matches `PlanRecommendationReason` in `SmartPlan-back`. Drives honest,
 * non-AI copy on each card; never surfaced as a raw value.
 *
 * `within_budget` and `well_rated_by_you` come from the user's own
 * post-experience feedback (CU23) and only appear once that feedback exists.
 */
export type PlanRecommendationReason =
  | 'history'
  | 'preferences'
  | 'near_you'
  | 'popular'
  | 'within_budget'
  | 'well_rated_by_you';

/**
 * Card-friendly plan projection for the recommendations rail. Same shape as
 * `PlanRequestPlanSummary` plus `imageUrl` — `null` until the backend has an
 * image source; the card falls back to an editorial treatment.
 */
export interface RecommendedPlanSummary extends PlanRequestPlanSummary {
  imageUrl: string | null;
}

/** One entry of `GET /plan-recommendations`. Matches `PlanRecommendationDto`. */
export interface PlanRecommendation {
  reason: PlanRecommendationReason;
  /** Always `false` in CU20 (the pool is other users' plans). Not acted on. */
  canSelect: boolean;
  plan: RecommendedPlanSummary;
}

/**
 * Section-level flags so the Home renders the recommendations honestly:
 * whether history/preferences shaped the order, and whether coordinates
 * were used.
 */
export interface RecommendationsMeta {
  personalized: boolean;
  locationUsed: boolean;
  /**
   * `true` when the user's post-experience feedback (CU23) actually moved the
   * ranking (CU21). Drives one honest section line and nothing otherwise;
   * never `true` without feedback.
   */
  adjustedFromFeedback: boolean;
}

/** Response of `GET /plan-recommendations`. Matches the backend envelope. */
export interface PlanRecommendationsResponse {
  data: PlanRecommendation[];
  pagination: PaginationMetadata;
  meta: RecommendationsMeta;
}

/** Query params accepted by `GET /plan-recommendations`. */
export interface RecommendationsQuery {
  limit?: number;
  latitude?: number;
  longitude?: number;
  maxDistanceKm?: number;
}
