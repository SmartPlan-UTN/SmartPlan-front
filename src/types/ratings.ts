import type { SortDirection } from './common';

/**
 * A rating as its own author sees it (CU44, CU46, CU47). There is no
 * automatic moderation (#156): it is public as soon as it is created, and
 * the author only ever learns that an administrator removed it after a
 * report. Matches `OwnRatingDto` in `SmartPlan-back`.
 */
export interface OwnRating {
  images?: import('./media').MediaImage[];
  id: number;
  score: number;
  comment: string | null;
  authorAlias: string;
  createdAt: string;
  updatedAt: string;
  isOwn: boolean;
  activityId: number;
  planId: number;
  /** An administrator removed it after a report; nobody else sees it. */
  removed: boolean;
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
 * identity beyond the alias. The list leaves out reported and removed
 * ratings, except the viewer's own one under review. Matches
 * `PublicRatingDto`.
 */
export interface PublicRating {
  images?: import('./media').MediaImage[];
  id: number;
  score: number;
  comment: string | null;
  authorAlias: string;
  createdAt: string;
  updatedAt: string;
  /** The viewer wrote it, so they cannot report it (#156). */
  isOwn: boolean;
}

/**
 * Aggregate shown above the review list (CU45's "Promedio y cantidad
 * total"). Matches `RatingSummaryDto` — counts only public ratings: one
 * under review or removed counts for no one.
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
