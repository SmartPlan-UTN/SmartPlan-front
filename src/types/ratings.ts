import type { SortDirection } from './common';

/**
 * Moderation outcome for a rating's comment (CU44, CU55). Resolved
 * synchronously on submit — `SmartPlan-back`'s `RatingModerationService`
 * classifies the comment (profanity list, then Gemini) before the create
 * request returns, so `OwnRating.moderationStatus` already reflects the
 * final state, not a pending async job.
 */
export type RatingModerationStatus = 'pending' | 'approved' | 'rejected';

/**
 * A rating as its own author sees it (CU44, CU46, CU47) — the only view
 * that includes moderation state, since that's only ever the author's
 * business. Matches `OwnRatingDto` in `SmartPlan-back`.
 */
export interface OwnRating {
  id: number;
  score: number;
  comment: string | null;
  authorAlias: string;
  createdAt: string;
  updatedAt: string;
  activityId: number;
  planId: number;
  moderationStatus: RatingModerationStatus;
  moderationReason: string | null;
}

/**
 * Payload for `POST /activities/:activityId/ratings` (CU44).
 *
 * `planId` is required by `SmartPlan-back`'s `CreateRatingDto`: a rating
 * must be tied to a completed plan that actually included this activity
 * (`ratings.service.ts`'s `requireEligiblePlan`) — see
 * `ActivityRatingSection`'s doc comment for how the frontend resolves it
 * without asking the user to pick a plan themselves.
 */
export interface CreateRatingInput {
  planId: number;
  score: number;
  comment?: string;
}

/**
 * Payload for `PATCH /ratings/:id` (CU46). Both fields are optional, but
 * `SmartPlan-back`'s `update` rejects a request with neither set
 * (`RATING_UPDATE_EMPTY`) — `EditRatingForm` always sends both anyway,
 * since it edits the whole rating at once, not one field at a time.
 */
export interface UpdateRatingInput {
  score?: number;
  comment?: string | null;
}

/**
 * A rating as anyone browsing the activity sees it (CU45) — no author
 * identity beyond the alias, no moderation state (the list endpoint only
 * ever returns approved ratings). Matches `PublicRatingDto`.
 */
export interface PublicRating {
  id: number;
  score: number;
  comment: string | null;
  authorAlias: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Aggregate shown above the review list (CU45's "Promedio y cantidad
 * total"). Matches `RatingSummaryDto` — counts only approved ratings, same
 * scope as the list itself.
 */
export interface RatingSummary {
  averageRating: number;
  ratingCount: number;
}

/** Sortable fields accepted by `GET /activities/:activityId/ratings`. */
export type RatingSortField = 'createdAt' | 'score';

/** Query params for CU45's paginated review list. */
export interface ListRatingsParams {
  page?: number;
  limit?: number;
  sortBy?: RatingSortField;
  direction?: SortDirection;
}
