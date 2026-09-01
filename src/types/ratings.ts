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
