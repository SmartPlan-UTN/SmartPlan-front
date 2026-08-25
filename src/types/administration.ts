import { BaseEntity } from './common';
import type { PaginatedResult, SortDirection } from './common';
import type { User } from './users';
import type { RoleKey, UserStatusKey } from './users';

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
