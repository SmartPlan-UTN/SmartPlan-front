import { BaseEntity, CatalogEntity } from './common';
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
 * Matches `PlanSummaryDto` in `SmartPlan-back`'s recommendation module —
 * no `activityNames` field, unlike the `GET /plans` search projection.
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
  status: { key: PlanStatusKey; name: string };
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
 * User's feedback after completing a plan (CU21, CU23).
 */
export interface Feedback extends BaseEntity {
  title: string;
  description: string | null;
  actualCost: number | null;
  actualDuration: number | null;
  idPlanRequest: number;
  idFeedbackStatus: number;
  status?: FeedbackStatus;
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
