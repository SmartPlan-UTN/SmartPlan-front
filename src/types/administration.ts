import { BaseEntity } from './common';
import type { PaginatedResult, SortDirection } from './common';
import type { User } from './users';
import type { RoleKey, UserStatusKey } from './users';
import type { PlanStatusKey } from './plans';
import type { RatingModerationStatus } from './ratings';

/**
 * Possible actions recorded in the audit log.
 * Values match `AuditAction` in SmartPlan-back
 * (`src/administration/entities/audit-log.entity.ts`).
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'start_session'
  | 'end_session';

/**
 * System audit log entry.
 */
export interface AuditLog extends BaseEntity {
  action: AuditAction;
  affectedEntity: string;
  affectedEntityId: number;
  original: Record<string, unknown> | null;
  changes: Record<string, unknown> | null;
}
/**
 * Configurable system parameter.
 */
export interface SystemParameter extends BaseEntity {
  name: string;
  value: number;
  description: string | null;
}

/**
 * Notification addressed to a user.
 */
export interface Notification extends BaseEntity {
  idUser: number;
  title: string;
  message: string;
  user?: User;
}

/**
 * Time window accepted by `GET /admin/metrics` (CU58, REP-01). Matches
 * `MetricsRange` in SmartPlan-back (`src/administration/dto/metrics-query.dto.ts`).
 */
export type DashboardRange = 'today' | '7d' | '30d' | 'month';

/**
 * One slice of a percentage breakdown (mood or group-size distribution).
 */
export interface DashboardDistributionEntry {
  key: string;
  name: string;
  count: number;
  percentage: number;
}

/**
 * One entry in the "most popular activities" ranking: an activity and how
 * many distinct plans included it within the selected range.
 */
export interface DashboardPopularActivity {
  id: number;
  name: string;
  planCount: number;
}

/**
 * One row of the recent-activity feed, sourced from the audit log.
 */
export interface DashboardRecentEntry {
  id: number;
  action: AuditAction;
  affectedEntity: string;
  affectedEntityId: number;
  /** The affected user's full name, the activity's name, or the plan's title. */
  label: string;
  createdAt: string;
}

/**
 * REP-01 dashboard payload returned by `GET /admin/metrics`.
 */
export interface DashboardMetrics {
  range: { key: DashboardRange; from: string; to: string };
  kpis: {
    totalUsers: number;
    activePlans: number;
    catalogActivities: number;
    pendingRatings: number;
  };
  acceptanceRate: number;
  averageRating: number;
  retentionRate: number;
  distributions: {
    moods: DashboardDistributionEntry[];
    groupSizes: DashboardDistributionEntry[];
  };
  popularActivities: DashboardPopularActivity[];
  recentActivity: DashboardRecentEntry[];
}

/** Safe user projection returned by the administration API (CU57). */
export interface AdminUser {
  id: number;
  name: string;
  lastName: string;
  email: string;
  role: { key: string; name: string };
  status: { key: UserStatusKey; name: string };
  createdAt: string;
  updatedAt: string;
}

/** Filters and pagination accepted by `GET /admin/users`. */
export interface AdminUsersQuery {
  search?: string;
  status?: UserStatusKey;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'name' | 'email' | 'role' | 'status';
  direction?: SortDirection;
}

/** Header values for REP-02, assembled from the current users listing contract. */
export interface AdminUserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;
}

/** Editable fields accepted by `PATCH /admin/users/:id`. */
export interface UpdateAdminUserInput {
  name?: string;
  lastName?: string;
  email?: string;
  role?: RoleKey;
  status?: UserStatusKey;
}

export type AdminUsersResult = PaginatedResult<AdminUser>;

/** Activity projection used by PAN 21 (CU53). */
export interface AdminActivity {
  id: number;
  name: string;
  description: string;
  estimatedCost: number;
  estimatedDuration: number;
  type: string | null;
  categories: Array<{ id: number; name: string }>;
  places: Array<{ id: number; name: string; address: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminActivitiesQuery {
  search?: string;
  type?: string;
  categoryId?: number;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'name' | 'price';
  direction?: SortDirection;
}

export interface AdminActivityInput {
  name: string;
  description: string;
  estimatedCost: number;
  estimatedDuration: number;
  type?: string | null;
  categoryIds: number[];
  placeIds?: number[];
}

export type UpdateAdminActivityInput = Partial<AdminActivityInput>;
export type AdminActivitiesResult = PaginatedResult<AdminActivity>;

/** Plan projection used by PAN 22 (CU60). */
export interface AdminPlan {
  id: number;
  title: string;
  description: string | null;
  estimatedTotalCost: number;
  estimatedTotalDuration: number;
  peopleCount: number;
  activityCount: number;
  owner: { id: number; name: string; lastName: string; email: string };
  status: { key: PlanStatusKey; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlansQuery {
  search?: string;
  status?: PlanStatusKey;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'title' | 'status' | 'cost';
  direction?: SortDirection;
}

export interface UpdateAdminPlanInput {
  title?: string;
  description?: string | null;
  peopleCount?: number;
  status?: PlanStatusKey;
}

export type AdminPlansResult = PaginatedResult<AdminPlan>;

/**
 * A rating as PAN 20 sees it (CU55) — the only projection that pairs
 * moderation state with the author's real identity, and the only one that
 * names the rated activity and the plan it came from.
 *
 * `authorAlias` ("Ana P.") stays in the payload because the administrative
 * row extends the public one, but the moderation tray shows `author`: an
 * administrator deciding on a comment is entitled to know who wrote it.
 * Matches `AdminRatingDto` in `SmartPlan-back`.
 */
export interface AdminRating {
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
  author: { id: number; name: string; lastName: string };
  activity: { id: number; name: string };
  plan: { id: number; title: string };
}

/** Filters and pagination accepted by `GET /admin/ratings`. */
export interface AdminRatingsQuery {
  status?: RatingModerationStatus;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'score';
  direction?: SortDirection;
}

export type AdminRatingsResult = PaginatedResult<AdminRating>;

/**
 * Payload for `PATCH /admin/ratings/:id/moderation` (CU55).
 *
 * A discriminated union rather than `{ status, reason? }`: `SmartPlan-back`'s
 * `ModerateRatingDto` requires a non-empty reason only when rejecting
 * (`ValidateIf`), and this shape makes a rejection without one impossible to
 * build instead of a `400` discovered at runtime.
 */
export type ModerateRatingInput =
  | { status: 'approved' }
  | { status: 'rejected'; reason: string };

/** How many ratings sit in each moderation state, for PAN 20's tab counters. */
export type AdminRatingCounts = Record<RatingModerationStatus, number>;
