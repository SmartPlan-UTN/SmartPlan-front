import { BaseEntity } from './common';
import type { PaginatedResult, SortDirection } from './common';
import type { User } from './users';
import type { RoleKey, UserStatusKey } from './users';
import type { PlanKind, PlanStatusKey, PlanVisibility } from './plans';

/**
 * Possible actions recorded in the audit log.
 * Values match `AuditAction` in SmartPlan-back
 * (`src/administration/entities/audit-log.entity.ts`).
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
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
    /** Content with open reports waiting for a decision (#156). */
    openReports: number;
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

/** Why Explorar leaves a plan out. Matches `ExploreHiddenCause` in SmartPlan-back. */
export type ExploreHiddenCause = 'generated' | 'outing' | 'private' | 'cancelled';

/** Plan projection used by PAN 22 (CU60). */
export interface AdminPlan {
  id: number;
  title: string;
  description: string | null;
  estimatedTotalCost: number;
  estimatedTotalDuration: number;
  peopleCount: number;
  activityCount: number;
  /**
   * Where the plan comes from; only `authored` plans can reach Explorar (#160).
   * Optional because back versions before SmartPlan-back#124 don't send it.
   */
  kind?: PlanKind;
  visibility?: PlanVisibility;
  /** Whether Explorar > Planes lists it right now, as SmartPlan-back decides. */
  listedInExplore?: boolean;
  /** Why Explorar leaves it out; `null` when listed. */
  exploreHiddenCause?: ExploreHiddenCause | null;
  owner: { id: number; name: string; lastName: string; email: string };
  status: { key: PlanStatusKey; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface AdminPlansQuery {
  search?: string;
  status?: PlanStatusKey;
  kind?: PlanKind;
  visibility?: PlanVisibility;
  /** Whether Explorar > Planes lists it right now, as SmartPlan-back decides. */
  listedInExplore?: boolean;
  /** Why Explorar leaves it out; `null` when listed. */
  exploreHiddenCause?: ExploreHiddenCause | null;
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

