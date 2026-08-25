import type {
  AdminUser,
  AdminUserMetrics,
  AdminUsersQuery,
  AdminUsersResult,
  DashboardMetrics,
  DashboardRange,
  UserStatusKey,
  UpdateAdminUserInput,
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
