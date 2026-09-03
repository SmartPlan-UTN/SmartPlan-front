import type {
  AdminUser,
  AdminUserMetrics,
  AdminUsersQuery,
  AdminUsersResult,
  DashboardMetrics,
  DashboardRange,
  UserStatusKey,
  UpdateAdminUserInput,
  AdminActivitiesQuery,
  AdminActivitiesResult,
  AdminActivity,
  AdminActivityInput,
  UpdateAdminActivityInput,
  AdminPlansQuery,
  AdminPlansResult,
  AdminPlan,
  UpdateAdminPlanInput,
  AdminRatingCounts,
  AdminRatingsQuery,
  AdminRatingsResult,
  AdminRating,
  ModerateRatingInput,
} from '@/types';
import { apiClient } from './client';

/** Loads the REP-01 dashboard metrics for the selected range (CU58). */
export async function getDashboardMetrics(
  range: DashboardRange
): Promise<DashboardMetrics> {
  return apiClient.get<DashboardMetrics>('/admin/metrics', {
    params: { range },
  });
}

/** Lists users for PAN 19, including search, status filtering, and pagination. */
export async function listAdminUsers(
  params: AdminUsersQuery = {}
): Promise<AdminUsersResult> {
  return apiClient.get<AdminUsersResult>('/admin/users', { params });
}

/** Suspends, bans, or reactivates one user account (CU57). */
export async function changeAdminUserStatus(
  id: number,
  status: UserStatusKey
): Promise<AdminUser> {
  return apiClient.patch<AdminUser>(`/admin/users/${id}/status`, { status });
}

/** Updates the editable profile, role, and status fields of an administered user. */
export async function updateAdminUser(
  id: number,
  input: UpdateAdminUserInput
): Promise<AdminUser> {
  return apiClient.patch<AdminUser>(`/admin/users/${id}`, input);
}

/** Lists the activity catalog for PAN 21 (CU53). */
export async function listAdminActivities(
  params: AdminActivitiesQuery = {},
): Promise<AdminActivitiesResult> {
  return apiClient.get<AdminActivitiesResult>('/admin/activities', { params });
}

export async function createAdminActivity(
  input: AdminActivityInput,
): Promise<AdminActivity> {
  return apiClient.post<AdminActivity>('/admin/activities', input);
}

export async function updateAdminActivity(
  id: number,
  input: UpdateAdminActivityInput,
): Promise<AdminActivity> {
  return apiClient.patch<AdminActivity>(`/admin/activities/${id}`, input);
}

export async function deleteAdminActivity(id: number): Promise<void> {
  return apiClient.delete<void>(`/admin/activities/${id}`);
}

/** Lists every user's plans for PAN 22 (CU60). */
export async function listAdminPlans(
  params: AdminPlansQuery = {},
): Promise<AdminPlansResult> {
  return apiClient.get<AdminPlansResult>('/admin/plans', { params });
}

export async function updateAdminPlan(
  id: number,
  input: UpdateAdminPlanInput,
): Promise<AdminPlan> {
  return apiClient.patch<AdminPlan>(`/admin/plans/${id}`, input);
}

export async function deleteAdminPlan(id: number): Promise<void> {
  return apiClient.delete<void>(`/admin/plans/${id}`);
}

/** Lists ratings awaiting or past moderation for PAN 20 (CU55). */
export async function listAdminRatings(
  params: AdminRatingsQuery = {},
): Promise<AdminRatingsResult> {
  return apiClient.get<AdminRatingsResult>('/admin/ratings', { params });
}

/**
 * Approves or rejects one rating (CU55). A rejection carries the reason the
 * backend requires; the input type makes sending one without it impossible.
 * Answers with the moderated row, already in its new state.
 */
export async function moderateAdminRating(
  id: number,
  input: ModerateRatingInput,
): Promise<AdminRating> {
  return apiClient.patch<AdminRating>(`/admin/ratings/${id}/moderation`, input);
}

/**
 * Counts the ratings in each moderation state, for PAN 20's tab badges.
 *
 * There's no counters endpoint, so this reads `pagination.total` from three
 * one-row listings — the same way `getAdminUserMetrics` builds REP-02's
 * header out of the listing contract. `limit: 1` because only the total is
 * wanted; the rows themselves are thrown away.
 */
export async function getAdminRatingCounts(): Promise<AdminRatingCounts> {
  const [pending, approved, rejected] = await Promise.all([
    listAdminRatings({ status: 'pending', page: 1, limit: 1 }),
    listAdminRatings({ status: 'approved', page: 1, limit: 1 }),
    listAdminRatings({ status: 'rejected', page: 1, limit: 1 }),
  ]);

  return {
    pending: pending.pagination.total,
    approved: approved.pagination.total,
    rejected: rejected.pagination.total,
  };
}

/**
 * Builds REP-02's available header metrics from the listing contract.
 *
 * The backend does not expose last-activity timestamps, so `activeUsers`
 * represents accounts whose current status is active. Weekly registrations
 * are read newest-first and stop as soon as a full page crosses the cutoff.
 */
export async function getAdminUserMetrics(now = new Date()): Promise<AdminUserMetrics> {
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const [allUsers, activeUsers] = await Promise.all([
    listAdminUsers({ page: 1, limit: 1 }),
    listAdminUsers({ page: 1, limit: 1, status: 'active' }),
  ]);

  let page = 1;
  let newUsersThisWeek = 0;
  let reachedCutoff = false;

  while (!reachedCutoff) {
    const result = await listAdminUsers({
      page,
      limit: 100,
      sortBy: 'createdAt',
      direction: 'desc',
    });

    for (const user of result.data) {
      if (new Date(user.createdAt) >= weekStart) {
        newUsersThisWeek += 1;
      } else {
        reachedCutoff = true;
        break;
      }
    }

    if (page >= result.pagination.totalPages || result.data.length === 0) {
      break;
    }
    page += 1;
  }

  return {
    totalUsers: allUsers.pagination.total,
    activeUsers: activeUsers.pagination.total,
    newUsersThisWeek,
  };
}
